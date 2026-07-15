import { useState } from "react";
import { Alert, Button, Card, Form, Input, Modal, Space, Tooltip, Typography, message } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { Can } from "../../../../shared/permissions";
import { useCurrentUserId } from "../../shared/hooks/useCurrentUserId";
import { useApproveRefund, useRejectRefund } from "../api/refunds.api";
import { formatVND } from "../../shared/utils";
import type { Refund } from "../../shared/types";

interface RefundActionPanelProps {
  refund: Refund;
}

type ActionType = "approve" | "reject" | null;

// BE không có bước "execute" riêng — approve đã kích hoàn tiền (COIN hoàn ví ngay,
// BANK_MANUAL chuyển khoản tay ngoài hệ thống) → chỉ còn approve/reject.
export function RefundActionPanel({ refund }: RefundActionPanelProps) {
  const currentUserId = useCurrentUserId();
  const approve = useApproveRefund();
  const reject = useRejectRefund();

  const [action, setAction] = useState<ActionType>(null);
  const [note, setNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isCreator = refund.createdBy === currentUserId;
  const canApprove = refund.status === "requested" && !isCreator;
  const canReject = refund.status === "requested" && !isCreator;

  function open(type: ActionType) {
    setAction(type);
    setNote("");
    setRejectReason("");
    setError(null);
  }

  function close() {
    setAction(null);
    setError(null);
  }

  function handleConfirm() {
    setError(null);
    if (action === "approve") {
      if (isCreator) {
        setError("Ngưởi duyệt phải khác ngưởi tạo yêu cầu");
        return;
      }
      approve.mutate(
        { id: refund.id, note: note.trim() || undefined },
        {
          onSuccess: () => {
            message.success("Đã duyệt refund");
            close();
          },
          onError: (err) => {
            setError(err.message);
            message.error(err.message);
          },
        }
      );
    } else if (action === "reject") {
      if (isCreator) {
        setError("Ngưởi từ chối phải khác ngưởi tạo yêu cầu");
        return;
      }
      const reason = rejectReason.trim();
      if (!reason) {
        setError("Vui lòng nhập lý do từ chối");
        return;
      }
      reject.mutate(
        { id: refund.id, reason },
        {
          onSuccess: () => {
            message.success("Đã từ chối refund");
            close();
          },
          onError: (err) => {
            setError(err.message);
            message.error(err.message);
          },
        }
      );
    }
  }

  return (
    <Can permissions={["commerce.refund.approve"]}>
      <Card title="Thao tác refund" style={{ marginTop: 16 }}>
        <Space>
          {refund.status === "requested" && (
            <>
              <Tooltip title={isCreator ? "Ngưởi duyệt phải khác ngưởi tạo" : ""}>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => open("approve")}
                  disabled={isCreator}
                >
                  Duyệt
                </Button>
              </Tooltip>
              <Tooltip title={isCreator ? "Ngưởi từ chối phải khác ngưởi tạo" : ""}>
                <Button
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => open("reject")}
                  disabled={isCreator}
                >
                  Từ chối
                </Button>
              </Tooltip>
            </>
          )}
          {refund.status === "approved" && (
            <Typography.Text type="secondary">
              Đã duyệt — COIN hoàn ví tự động; BANK chuyển khoản tay ngoài hệ thống.
            </Typography.Text>
          )}
          {!canApprove && !canReject && refund.status !== "approved" && (
            <Typography.Text type="secondary">Không có thao tác khả dụng cho trạng thái này.</Typography.Text>
          )}
        </Space>
      </Card>

      <Modal
        open={action !== null}
        title={action === "approve" ? "Duyệt refund" : "Từ chối refund"}
        onOk={handleConfirm}
        onCancel={close}
        confirmLoading={approve.isPending || reject.isPending}
        okText="Xác nhận"
        cancelText="Huỷ"
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          {action === "approve" && (
            <Alert
              type="warning"
              message="Hệ quả"
              description={`Duyệt sẽ kích hoạt hoàn ${formatVND(refund.amount)} (COIN hoàn ví ngay, BANK chờ chuyển khoản tay) và thu hồi entitlement. Ghi log audit, không hoàn tác được.`}
              showIcon
            />
          )}
          {action === "reject" && (
            <Alert
              type="warning"
              message="Hệ quả"
              description="Yêu cầu refund sẽ bị từ chối và đóng."
              showIcon
            />
          )}
          <Typography.Text>
            Refund: <strong>{refund.id}</strong> — Số tiền: <strong>{formatVND(refund.amount)}</strong>
          </Typography.Text>
          {action === "approve" && (
            <Form.Item label="Ghi chú duyệt">
              <Input.TextArea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú tùy chọn"
              />
            </Form.Item>
          )}
          {action === "reject" && (
            <Form.Item
              label="Lý do từ chối"
              validateStatus={error ? "error" : undefined}
              help={error}
              required
            >
              <Input.TextArea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Bắt buộc"
              />
            </Form.Item>
          )}
          {action !== "reject" && error && (
            <Alert type="error" message={error} />
          )}
        </Space>
      </Modal>
    </Can>
  );
}
