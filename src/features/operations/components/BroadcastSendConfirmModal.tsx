import { useState } from "react";
import { Alert, Form, Input, Modal, Space, Typography } from "antd";
import type { BroadcastChannel } from "../shared/types";

interface BroadcastSendConfirmModalProps {
  open: boolean;
  title: string;
  recipientCount: number;
  channels: BroadcastChannel[];
  onClose: () => void;
  onConfirm: () => void;
  confirmLoading?: boolean;
}

export function BroadcastSendConfirmModal({
  open,
  title,
  recipientCount,
  channels,
  onClose,
  onConfirm,
  confirmLoading,
}: BroadcastSendConfirmModalProps) {
  const [typedCount, setTypedCount] = useState("");
  const requiresRetype = recipientCount > 1000;
  const typedOk = !requiresRetype || typedCount === String(recipientCount);

  return (
    <Modal
      open={open}
      title="Xác nhận gửi broadcast"
      onCancel={onClose}
      onOk={onConfirm}
      confirmLoading={confirmLoading}
      okText="Gửi"
      cancelText="Huỷ"
      okButtonProps={{ danger: true, disabled: !typedOk }}
      afterClose={() => setTypedCount("")}
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Alert
          type="warning"
          message="Không thể thu hồi sau khi gửi"
          description="Broadcast sẽ được gửi ngay lập tức đến danh sách đã chọn."
        />
        <Typography.Text>
          Tiêu đề: <strong>{title}</strong>
        </Typography.Text>
        <Typography.Text>
          Kênh: <strong>{channels.join(", ")}</strong>
        </Typography.Text>
        <Typography.Text>
          Số đối tượng nhận: <strong>{recipientCount.toLocaleString()}</strong>
        </Typography.Text>
        {requiresRetype && (
          <Form.Item
            label="Vui lòng gõ lại số đối tượng nhận để xác nhận"
            validateStatus={typedOk ? undefined : "error"}
            help={typedOk ? undefined : "Số nhập không khớp"}
          >
            <Input
              value={typedCount}
              onChange={(e) => setTypedCount(e.target.value)}
              placeholder={String(recipientCount)}
              autoFocus
            />
          </Form.Item>
        )}
      </Space>
    </Modal>
  );
}
