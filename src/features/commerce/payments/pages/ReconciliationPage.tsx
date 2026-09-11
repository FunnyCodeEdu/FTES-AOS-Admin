import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Radio,
  Skeleton,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useReconciliation, useResolveReconciliationRow } from "../api/payments.api";
import { formatVND } from "../../shared/utils";
import type { ReconciliationRow, ReconciliationRowStatus } from "../../shared/types";
import type { TableProps } from "antd";

const STATUS_LABELS: Record<ReconciliationRowStatus, string> = {
  matched: "Đã khớp",
  webhook_unmatched: "Webhook chưa khớp order",
  order_missing_payment: "Order thiếu payment",
  duplicate_webhook: "Webhook trùng lặp",
  resolved: "Đã xử lý",
};

function reconStatusLabel(s: ReconciliationRowStatus): string {
  return (
    STATUS_LABELS[s] ??
    STATUS_LABELS[(s ?? "").toString().toLowerCase() as ReconciliationRowStatus] ??
    String(s ?? "")
  );
}

function reconStatusColor(s: ReconciliationRowStatus): string {
  if (s === "matched" || s === "resolved") return "success";
  if (s === "order_missing_payment") return "error";
  if (s === "duplicate_webhook") return "purple";
  return "warning";
}

export default function ReconciliationPage() {
  const [range, setRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([
    dayjs().subtract(7, "day").startOf("day"), dayjs().endOf("day"),
  ]);
  const dateFrom = range[0]?.startOf("day").toISOString() ?? "";
  // Backend dùng cửa sổ nửa mở [from,to), vì vậy cộng sang đầu ngày kế tiếp để không bỏ mất
  // giao dịch trong ngày cuối mà admin chọn.
  const dateTo = range[1]?.add(1, "day").startOf("day").toISOString() ?? "";

  const { data, isLoading, isError, error, refetch } = useReconciliation(dateFrom, dateTo);
  const resolve = useResolveReconciliationRow();

  const [selectedRow, setSelectedRow] = useState<ReconciliationRow | null>(null);
  // BE chỉ có POST /orders/{orderId}/recheck cho dòng lệch; ignore/flag chưa có endpoint → disable.
  const [action, setAction] = useState<"match_order" | "ignore" | "flag">("match_order");
  const [orderId, setOrderId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  function openResolve(row: ReconciliationRow) {
    setSelectedRow(row);
    setAction("match_order");
    setOrderId(row.orderId ?? "");
    setFormError(null);
  }

  function closeResolve() {
    setSelectedRow(null);
    setFormError(null);
  }

  function handleResolve() {
    setFormError(null);
    if (!selectedRow || !dateFrom || !dateTo) return;
    if (action !== "match_order") {
      setFormError("Backend chưa hỗ trợ hành động này");
      return;
    }
    if (!orderId.trim()) {
      setFormError("Vui lòng nhập mã order để recheck");
      return;
    }
    resolve.mutate(
      { orderId: orderId.trim(), dateFrom, dateTo },
      {
        onSuccess: (res) => {
          message.success(
            res.matched
              ? `Đã khớp payment và xác nhận PAID cho đơn ${orderId.trim()}`
              : `Recheck xong, đơn không đổi (trạng thái: ${res.orderStatus})`
          );
          closeResolve();
        },
        onError: (err) => message.error(err.message),
      }
    );
  }

  const columns: TableProps<ReconciliationRow>["columns"] = [
    { title: "Kết quả", dataIndex: "status", render: (s: ReconciliationRowStatus) => <Tag color={reconStatusColor(s)}>{reconStatusLabel(s)}</Tag> },
    {
      title: "Khách hàng",
      render: (_: unknown, row: ReconciliationRow) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{row.buyerName || "—"}</Typography.Text>
          <Typography.Text type="secondary">{row.buyerEmail || row.buyerId || "Không xác định"}</Typography.Text>
        </Space>
      ),
    },
    {
      title: "Số tiền",
      render: (_: unknown, row: ReconciliationRow) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{formatVND(row.amount)}</Typography.Text>
          {row.orderAmount != null && row.orderAmount !== row.amount && (
            <Typography.Text type="danger">Order: {formatVND(row.orderAmount)}</Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: "Giao dịch",
      render: (_: unknown, row: ReconciliationRow) => (
        <Space direction="vertical" size={0}>
          <Typography.Text copyable>{row.transactionCode || "Chưa có mã GD"}</Typography.Text>
          <Typography.Text type="secondary">{row.bankName || row.gateway || "—"}</Typography.Text>
        </Space>
      ),
    },
    {
      title: "Order",
      render: (_: unknown, row: ReconciliationRow) => row.orderId ? (
        <Space direction="vertical" size={0}>
          <Link to={`/commerce/orders/${row.orderId}`}>{row.orderCode}</Link>
          <Typography.Text type="secondary">{row.orderStatus || "—"}</Typography.Text>
        </Space>
      ) : <Typography.Text type="secondary">Chưa nhận diện</Typography.Text>,
    },
    { title: "Thời gian", dataIndex: "occurredAt", render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm:ss") },
    {
      title: "Thao tác",
      render: (_: unknown, row: ReconciliationRow) => row.status === "matched" ? null : (
        <Tooltip title={row.orderStatus === "AWAITING_PAYMENT" ? "Kiểm tra lại payment của order đang chờ" : "Dòng này cần điều tra/hoàn tiền thủ công; recheck chỉ an toàn với order đang chờ thanh toán"}>
          <Button size="small" onClick={() => openResolve(row)} disabled={row.orderStatus !== "AWAITING_PAYMENT"}>
            Recheck order
          </Button>
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Đối soát VietQR</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <DatePicker.RangePicker value={range} onChange={(v) => setRange(v ?? [null, null])} />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Làm mới
          </Button>
        </Space>
      </Card>

      {isLoading && <Skeleton active paragraph={{ rows: 6 }} />}

      {isError && (
        <Alert
          type="error"
          message="Không thể tải báo cáo đối soát"
          description={error?.message}
          action={<Button icon={<ReloadOutlined />} onClick={() => refetch()}>Thử lại</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      {data && (
        <>
          <Descriptions bordered style={{ marginBottom: 16 }} column={5}>
            <Descriptions.Item label="Đã khớp">{data.summary.matched}</Descriptions.Item>
            <Descriptions.Item label="Lệch">{data.summary.mismatched}</Descriptions.Item>
            <Descriptions.Item label="Thiếu">{data.summary.missing}</Descriptions.Item>
            <Descriptions.Item label="Đang chờ thanh toán">{data.summary.pendingIntents}</Descriptions.Item>
            <Descriptions.Item label="Legacy loại trừ">{data.summary.legacyExcluded}</Descriptions.Item>
          </Descriptions>

          {data.summary.mismatched + data.summary.missing === 0 && (
            <Alert type="success" showIcon message="Các giao dịch trong kỳ đã khớp; bản ghi phát QR không bị tính là lỗi." style={{ marginBottom: 16 }} />
          )}
          {data.summary.legacyExcluded > 0 && (
            <Alert type="info" showIcon message={`Đã loại ${data.summary.legacyExcluded} đơn legacy khỏi sai lệch`} description="Các đơn này được chuyển từ hệ thống cũ trước khi có sổ payment, nên không thể coi là giao dịch ngân hàng bị thiếu." style={{ marginBottom: 16 }} />
          )}
          <Table
            rowKey="id"
            columns={columns}
            dataSource={data.rows}
            pagination={{ pageSize: 20, showSizeChanger: true }}
            expandable={{
              expandedRowRender: (row) => (
                <Descriptions size="small" bordered column={2}>
                  <Descriptions.Item label="Payment ID">{row.paymentId ?? "—"}</Descriptions.Item>
                  <Descriptions.Item label="Trạng thái payment">{row.paymentStatus ?? "—"}</Descriptions.Item>
                  <Descriptions.Item label="Buyer ID">{row.buyerId ?? "—"}</Descriptions.Item>
                  <Descriptions.Item label="Gateway">{row.gateway ?? "—"}</Descriptions.Item>
                  <Descriptions.Item label="Sản phẩm" span={2}>
                    {row.orderItems.length > 0 ? (
                      <Space direction="vertical" size={0}>
                        {row.orderItems.map((item) => (
                          <Typography.Text key={item.id}>
                            {item.productName || item.courseId || "Sản phẩm"} × {item.quantity}
                            {" — "}{formatVND(item.totalAmount)}
                            {item.fulfillmentStatus ? ` • ${item.fulfillmentStatus}` : ""}
                          </Typography.Text>
                        ))}
                      </Space>
                    ) : "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Kết luận" span={2}>{row.note ?? "—"}</Descriptions.Item>
                </Descriptions>
              ),
            }}
            locale={{ emptyText: "Không có giao dịch ngân hàng trong khoảng đã chọn" }}
          />
        </>
      )}

      {selectedRow && (
        <Card title="Kiểm tra lại dòng lệch" style={{ marginTop: 24 }}>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Typography.Text>
              Đang xử lý: <strong>{reconStatusLabel(selectedRow.status)}</strong> — {formatVND(selectedRow.amount)}
            </Typography.Text>
            <Radio.Group value={action} onChange={(e) => setAction(e.target.value)}>
              <Radio value="match_order">Recheck order đã nhận diện</Radio>
              <Tooltip title="Backend chưa hỗ trợ lưu ghi chú bỏ qua dòng lệch">
                <Radio value="ignore" disabled>Bỏ qua</Radio>
              </Tooltip>
              <Tooltip title="Backend chưa hỗ trợ cắm cờ điều tra">
                <Radio value="flag" disabled>Cắm cờ điều tra</Radio>
              </Tooltip>
            </Radio.Group>
            <Form.Item
              label="Mã order"
              required
              validateStatus={formError ? "error" : undefined}
              help={
                formError ??
                "BE sẽ query lại payment của đơn; khớp số tiền thì xác nhận PAID + kích fulfillment."
              }
            >
              <Input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Nhập orderId" />
            </Form.Item>
            <Space>
              <Button type="primary" onClick={handleResolve} loading={resolve.isPending}>
                Xác nhận
              </Button>
              <Button onClick={closeResolve}>Huỷ</Button>
            </Space>
          </Space>
        </Card>
      )}
    </div>
  );
}
