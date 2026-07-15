import { useState } from "react";
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

export default function ReconciliationPage() {
  const [range, setRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([dayjs().subtract(7, "day"), dayjs()]);
  const dateFrom = range[0]?.toISOString() ?? "";
  const dateTo = range[1]?.toISOString() ?? "";

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
    setOrderId("");
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
    { title: "Loại lệch", dataIndex: "status", render: (s: ReconciliationRowStatus) => <Tag>{reconStatusLabel(s)}</Tag> },
    { title: "Số tiền", dataIndex: "amount", render: formatVND },
    { title: "Mã giao dịch", dataIndex: "transactionCode" },
    { title: "Order", dataIndex: "orderCode" },
    {
      title: "Thao tác",
      render: (_: unknown, row: ReconciliationRow) => (
        <Button size="small" onClick={() => openResolve(row)}>
          Xử lý
        </Button>
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
          <Descriptions bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Đã khớp">{data.summary.matched}</Descriptions.Item>
            <Descriptions.Item label="Lệch">{data.summary.mismatched}</Descriptions.Item>
            <Descriptions.Item label="Thiếu">{data.summary.missing}</Descriptions.Item>
          </Descriptions>

          {data.rows.length === 0 ? (
            <Alert type="success" message="Đối soát khớp 100%" />
          ) : (
            <Table rowKey="id" columns={columns} dataSource={data.rows} pagination={false} />
          )}
        </>
      )}

      {selectedRow && (
        <div style={{ display: "none" }}>
          {/* placeholder for modal mount point below */}
        </div>
      )}

      <Typography.Title level={5} style={{ marginTop: 24 }}>
        Xử lý dòng lệch
      </Typography.Title>
      <Card>
        {selectedRow ? (
          <Space direction="vertical" style={{ width: "100%" }}>
            <Typography.Text>
              Đang xử lý: <strong>{reconStatusLabel(selectedRow.status)}</strong> — {formatVND(selectedRow.amount)}
            </Typography.Text>
            <Radio.Group value={action} onChange={(e) => setAction(e.target.value)}>
              <Radio value="match_order">Recheck / gán vào order</Radio>
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
        ) : (
          <Typography.Text type="secondary">Chọn một dòng lệch để xử lý.</Typography.Text>
        )}
      </Card>
    </div>
  );
}
