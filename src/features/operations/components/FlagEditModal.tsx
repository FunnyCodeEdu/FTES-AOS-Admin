import { Alert, Descriptions, Modal, Tag } from "antd";
import type { FlagItem } from "../api/flags.api";

interface FlagEditModalProps {
  open: boolean;
  flag?: FlagItem | null;
  onClose: () => void;
}

// TODO(be): chỉ hiển thị (read-only). FTES-AOS-Backend chưa có mutation/REST để bật/tắt flag,
// nên bỏ form toggle/rollout/segment cũ (trỏ endpoint không tồn tại). Khi BE ship mutation
// toggle `enabled`, thêm lại switch + gọi mutation ở đây.
export function FlagEditModal({ open, flag, onClose }: FlagEditModalProps) {
  return (
    <Modal
      open={open}
      title={`Feature flag: ${flag?.key ?? ""}`}
      onCancel={onClose}
      footer={null}
    >
      <Alert
        type="info"
        message="Chỉ đọc — chưa có API chỉnh sửa flag từ backend."
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="Key">{flag?.key ?? "—"}</Descriptions.Item>
        <Descriptions.Item label="Mô tả">{flag?.description ?? "—"}</Descriptions.Item>
        <Descriptions.Item label="Trạng thái">
          {flag?.enabled ? <Tag color="green">Đang bật</Tag> : <Tag>Đang tắt</Tag>}
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
}
