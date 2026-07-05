import { useState } from "react";
import { Form, Input, Modal, Typography } from "antd";

interface RevokeInviteModalProps {
  open: boolean;
  email: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  confirmLoading?: boolean;
}

export function RevokeInviteModal({ open, email, onClose, onConfirm, confirmLoading }: RevokeInviteModalProps) {
  const [reason, setReason] = useState("");

  return (
    <Modal
      open={open}
      title="Thu hồi invitation"
      onCancel={onClose}
      onOk={() => onConfirm(reason.trim())}
      confirmLoading={confirmLoading}
      okText="Thu hồi"
      cancelText="Huỷ"
      okButtonProps={{ danger: true, disabled: !reason.trim() }}
      afterClose={() => setReason("")}
    >
      <Typography.Paragraph>
        Recipient <strong>{email}</strong> sẽ không còn có thể chấp nhận invitation này.
      </Typography.Paragraph>
      <Form.Item
        label="Lý do thu hồi (bắt buộc)"
        validateStatus={reason.trim() ? undefined : "error"}
        help={reason.trim() ? undefined : "Vui lòng nhập lý do"}
      >
        <Input.TextArea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Form.Item>
    </Modal>
  );
}
