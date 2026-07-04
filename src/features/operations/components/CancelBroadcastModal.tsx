import { Modal, Typography } from "antd";

interface CancelBroadcastModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmLoading?: boolean;
}

export function CancelBroadcastModal({ open, title, onClose, onConfirm, confirmLoading }: CancelBroadcastModalProps) {
  return (
    <Modal
      open={open}
      title="Huỷ broadcast đã lên lịch"
      onCancel={onClose}
      onOk={onConfirm}
      confirmLoading={confirmLoading}
      okText="Huỷ lịch"
      cancelText="Giữ lại"
      okButtonProps={{ danger: true }}
    >
      <Typography.Text>
        Broadcast <strong>{title}</strong> sẽ bị huỷ và không gửi đi nữa. Tiếp tục?
      </Typography.Text>
    </Modal>
  );
}
