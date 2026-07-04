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

export default function ReconciliationPage() {
  const [range, setRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([dayjs().subtract(7, "day"), dayjs()]);
  const dateFrom = range[0]?.toISOString() ?? "";
  const dateTo = range[1]?.toISOString() ?? "";

  const { data, isLoading, isError, error, refetch } = useReconciliation(dateFrom, dateTo);
  const resolve = useResolveReconciliationRow();

  const [selectedRow, setSelectedRow] = useState<ReconciliationRow | null>(null);
  const [action, setAction] = useState<"match_order" | "ignore" | "flag">("ignore");
  const [orderId, setOrderId] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  function openResolve(row: ReconciliationRow) {
    setSelectedRow(row);
    setAction("ignore");
    setOrderId("");
    setNote("");
    setFormError(null);
  }

  function closeResolve() {
    setSelectedRow(null);
    setFormError(null);
  }

  function handleResolve() {
    setFormError(null);
    if (!selectedRow || !dateFrom || !dateTo) return;
    if (!note.trim()) {
      setFormError("Vui lòng nhập ghi chú");
      return;
    }
    if (action === "match_order" && !orderId.trim()) {
      setFormError("Vui lòng nhập mã order để gán");
      return;
    }
    resolve.mutate(
      {
        rowId: selectedRow.id,
        action,
        orderId: action === "match_order" ? orderId.trim() : undefined,
        note: note.trim(),
        dateFrom,
        dateTo,
      },
      {
        onSuccess: () => {
          message.success("Đã xử lý dòng lệch");
          closeResolve();
        },
        onError: (err) => message.error(err.message),
      }
    );
  }

  const columns: TableProps<ReconciliationRow>["columns"] = [
    { title: "Loại lệch", dataIndex: "status", render: (s: ReconciliationRowStatus) => <Tag>{STATUS_LABELS[s]}</Tag> },
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
              Đang xử lý: <strong>{STATUS_LABELS[selectedRow.status]}</strong> — {formatVND(selectedRow.amount)}
            </Typography.Text>
            <Radio.Group value={action} onChange={(e) => setAction(e.target.value)}>
              <Radio value="match_order">Gán vào order</Radio>
              <Radio value="ignore">Bỏ qua</Radio>
              <Radio value="flag">Cắm cờ điều tra</Radio>
            </Radio.Group>
            {action === "match_order" && (
              <Form.Item label="Mã order" required>
                <Input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Nhập orderId" />
              </Form.Item>
            )}
            <Form.Item
              label="Ghi chú"
              validateStatus={formError ? "error" : undefined}
              help={formError}
              required
            >
              <Input.TextArea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Bắt buộc"
              />
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
