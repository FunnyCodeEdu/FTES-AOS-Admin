import { useState } from "react";
import {
  Alert,
  Button,
  Form,
  Input,
  Space,
  Table,
  Tooltip,
  Typography,
  message,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useCurrentUserId } from "../../shared/hooks/useCurrentUserId";
import { useApproveAdjustment, usePendingAdjustments, useRejectAdjustment } from "../api/wallets.api";
import { formatVND } from "../../shared/utils";
import type { WalletAdjustment } from "../../shared/types";
import type { TableProps } from "antd";

export function PendingAdjustmentsTab() {
  const currentUserId = useCurrentUserId();
  const { data, isLoading, isError, error, refetch } = usePendingAdjustments();
  const approve = useApproveAdjustment();
  const reject = useRejectAdjustment();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  function startReject(id: string) {
    setSelectedId(id);
    setRejectReason("");
    setFormError(null);
  }

  function cancelReject() {
    setSelectedId(null);
    setFormError(null);
  }

  function handleApprove(id: string, createdBy: string) {
    if (createdBy === currentUserId) {
      message.error("Không thể tự duyệt yêu cầu của chính mình");
      return;
    }
    approve.mutate({ id });
  }

  function handleReject() {
    setFormError(null);
    if (!selectedId) return;
    if (!rejectReason.trim()) {
      setFormError("Vui lòng nhập lý do từ chối");
      return;
    }
    reject.mutate({ id: selectedId, reason: rejectReason.trim() }, { onSuccess: cancelReject });
  }

  const columns: TableProps<WalletAdjustment>["columns"] = [
    { title: "User", dataIndex: "userName" },
    {
      title: "Số tiền",
      dataIndex: "amount",
      render: (v: number) => (
        <Typography.Text type={v >= 0 ? "success" : "danger"}>
          {v >= 0 ? "+" : ""}
          {formatVND(v)}
        </Typography.Text>
      ),
    },
    { title: "Lý do", dataIndex: "reason" },
    { title: "Ngưởi tạo", dataIndex: "createdByName" },
    {
      title: "Thao tác",
      render: (_: unknown, row: WalletAdjustment) => {
        const isCreator = row.createdBy === currentUserId;
        return (
          <Space>
            <Tooltip title={isCreator ? "Không thể tự duyệt" : ""}>
              <Button
                size="small"
                type="primary"
                onClick={() => handleApprove(row.id, row.createdBy)}
                disabled={isCreator}
              >
                Duyệt
              </Button>
            </Tooltip>
            <Button size="small" danger onClick={() => startReject(row.id)}>
              Từ chối
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      {isError && (
        <Alert
          type="error"
          message="Không thể tải danh sách chờ duyệt"
          description={error?.message}
          action={<Button icon={<ReloadOutlined />} onClick={() => refetch()}>Thử lại</Button>}
          style={{ marginBottom: 16 }}
        />
      )}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={isLoading}
        pagination={false}
      />
      {selectedId && (
        <>
          <Typography.Title level={5} style={{ marginTop: 24 }}>
            Từ chối điều chỉnh
          </Typography.Title>
          <Form.Item
            label="Lý do từ chối"
            validateStatus={formError ? "error" : undefined}
            help={formError}
            required
          >
            <Input.TextArea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Bắt buộc"
            />
          </Form.Item>
          <Space>
            <Button type="primary" danger onClick={handleReject} loading={reject.isPending}>
              Xác nhận từ chối
            </Button>
            <Button onClick={cancelReject}>Huỷ</Button>
          </Space>
        </>
      )}
    </div>
  );
}
