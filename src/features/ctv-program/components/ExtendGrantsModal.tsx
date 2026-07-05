import { useState } from "react";
import { DatePicker, Input, Modal, Select, Space, Typography } from "antd";
import dayjs from "dayjs";
import type { CtvGrant } from "../shared/types";

interface ExtendGrantsModalProps {
  open: boolean;
  grants: CtvGrant[];
  onClose: () => void;
  onConfirm: (grantIds: string[], newExpiresAt: string, reason: string) => void;
  confirmLoading?: boolean;
}

export function ExtendGrantsModal({ open, grants, onClose, onConfirm, confirmLoading }: ExtendGrantsModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [newExpiresAt, setNewExpiresAt] = useState<dayjs.Dayjs | null>(null);
  const [reason, setReason] = useState("");

  const handleOk = () => {
    if (!newExpiresAt || selectedIds.length === 0 || !reason.trim()) return;
    onConfirm(selectedIds, newExpiresAt.toISOString(), reason.trim());
  };

  return (
    <Modal
      open={open}
      title="Gia hạn grant"
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      okText="Gia hạn"
      cancelText="Huỷ"
      okButtonProps={{ disabled: selectedIds.length === 0 || !newExpiresAt || !reason.trim() }}
      afterClose={() => { setSelectedIds([]); setNewExpiresAt(null); setReason(""); }}
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Typography.Text>Chọn grant để gia hạn:</Typography.Text>
        <Select
          mode="multiple"
          placeholder="Chọn grant"
          value={selectedIds}
          onChange={setSelectedIds}
          options={grants.map((g) => ({ label: `${g.scopeType}:${g.scopeId} (hết hạn ${dayjs(g.expiresAt).format("DD/MM/YYYY")})`, value: g.id }))}
          style={{ width: "100%" }}
        />
        <DatePicker
          showTime
          placeholder="Hạn mới"
          value={newExpiresAt}
          onChange={setNewExpiresAt}
          disabledDate={(d) => d.isBefore(dayjs(), "day")}
          style={{ width: "100%" }}
        />
        <Input.TextArea
          placeholder="Lý do gia hạn (bắt buộc)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
        {selectedIds.length > 0 && newExpiresAt && (
          <Typography.Text type="secondary">
            {selectedIds.length} grant sẽ được gia hạn đến {newExpiresAt.format("DD/MM/YYYY HH:mm")}.
          </Typography.Text>
        )}
      </Space>
    </Modal>
  );
}
