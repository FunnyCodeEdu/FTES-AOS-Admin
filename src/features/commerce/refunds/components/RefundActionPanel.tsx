import { useState } from "react";
import { Alert, Button, Card, Form, Input, Modal, Radio, Space, Tooltip, Typography, message } from "antd";
import { CheckOutlined, CloseOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { Can } from "../../../../shared/permissions";
import { useCurrentUserId } from "../../shared/hooks/useCurrentUserId";
import { useApproveRefund, useExecuteRefund, useRejectRefund } from "../api/refunds.api";
import { formatVND } from "../../shared/utils";
import type { Refund } from "../../shared/types";

interface RefundActionPanelProps {
  refund: Refund;
}

type ActionType = "approve" | "reject" | "execute" | null;

export function RefundActionPanel({ refund }: RefundActionPanelProps) {
  const currentUserId = useCurrentUserId();
  const approve = useApproveRefund();
  const reject = useRejectRefund();
  const execute = useExecuteRefund();

  const [action, setAction] = useState<ActionType>(null);
  const [note, setNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [channel, setChannel] = useState<"bank" | "wallet">("bank");
  const [error, setError] = useState<string | null>(null);

  const isCreator = refund.createdBy === currentUserId;
  const canApprove = refund.status === "requested" && !isCreator;
  const canReject = refund.status === "requested" && !isCreator;
  const canExecute = refund.status === "approved";

  function open(type: ActionType) {
    setAction(type);
    setNote("");
    setRejectReason("");
    setChannel("bank");
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
    } else if (action === "execute") {
      execute.mutate(
        { id: refund.id, channel },
        {
          onSuccess: () => {
            message.success("Đã thực thi refund");
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
          <Can permissions={["commerce.refund.approve"]}>
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
          </Can>
          <Can permissions={["commerce.refund.approve"]}>
            {refund.status === "approved" && (
              <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => open("execute")}>
                Thực thi refund
              </Button>
            )}
          </Can>
          {!canApprove && !canReject && !canExecute && (
            <Typography.Text type="secondary">Không có thao tác khả dụng cho trạng thái này.</Typography.Text>
          )}
        </Space>
      </Card>

      <Modal
        open={action !== null}
        title={
          action === "approve"
            ? "Duyệt refund"
            : action === "reject"
            ? "Từ chối refund"
            : "Thực thi refund"
        }
        onOk={handleConfirm}
        onCancel={close}
        confirmLoading={approve.isPending || reject.isPending || execute.isPending}
        okText="Xác nhận"
        cancelText="Huỷ"
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          {action === "execute" && (
            <Alert
              type="warning"
              message="Hệ quả"
              description={`Hoàn ${formatVND(refund.amount)} về kênh đã chọn. Hành động này ghi log audit và không thể hoàn tác.`}
              showIcon
            />
          )}
          {action === "approve" && (
            <Alert
              type="info"
              message="Hệ quả"
              description="Yêu cầu refund sẽ chuyển sang trạng thái chờ thực thi."
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
          {action === "execute" && (
            <Form.Item label="Kênh hoàn tiền" required>
              <Radio.Group value={channel} onChange={(e) => setChannel(e.target.value)}>
                <Radio value="bank">Chuyển khoản ngân hàng</Radio>
                <Radio value="wallet">Hoàn vào ví</Radio>
              </Radio.Group>
            </Form.Item>
          )}
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
