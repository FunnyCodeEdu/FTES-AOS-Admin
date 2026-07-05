import { useState } from "react";
import { Input, Modal, Select, Space, Typography } from "antd";
import type { CtvGrant } from "../shared/types";

interface RevokeGrantsModalProps {
  open: boolean;
  grants: CtvGrant[];
  onClose: () => void;
  onConfirm: (grantIds: string[], reason: string) => void;
  confirmLoading?: boolean;
}

export function RevokeGrantsModal({ open, grants, onClose, onConfirm, confirmLoading }: RevokeGrantsModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reason, setReason] = useState("");

  const handleOk = () => {
    if (selectedIds.length === 0 || !reason.trim()) return;
    onConfirm(selectedIds, reason.trim());
  };

  return (
    <Modal
      open={open}
      title="Thu hồi grant"
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      okText="Thu hồi"
      cancelText="Huỷ"
      okButtonProps={{ danger: true, disabled: selectedIds.length === 0 || !reason.trim() }}
      afterClose={() => { setSelectedIds([]); setReason(""); }}
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Typography.Paragraph type="danger">
          CTV sẽ mất ngay quyền trên các scope đã chọn. Công việc đang dở trong scope sẽ không truy cập được.
        </Typography.Paragraph>
        <Select
          mode="multiple"
          placeholder="Chọn grant thu hồi"
          value={selectedIds}
          onChange={setSelectedIds}
          options={grants.map((g) => ({ label: `${g.scopeType}:${g.scopeName} — ${g.permissions.join(", ")}`, value: g.id }))}
          style={{ width: "100%" }}
        />
        <Input.TextArea
          placeholder="Lý do thu hồi (bắt buộc)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
      </Space>
    </Modal>
  );
}
