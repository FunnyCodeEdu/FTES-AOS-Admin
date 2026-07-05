import { useMemo, useState } from "react";
import { DatePicker, Input, Modal, Select, Space, Typography } from "antd";
import dayjs from "dayjs";
import { useGrantablePermissions } from "../api/grantablePermissions.api";
import type { CtvScopeRef } from "../shared/types";

interface ExpandGrantsModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (scopes: CtvScopeRef[], permissions: string[], expiresAt: string, reason: string) => void;
  confirmLoading?: boolean;
}

const SCOPE_TYPE_OPTIONS = [
  { label: "Group", value: "GROUP" },
  { label: "Subject", value: "SUBJECT" },
  { label: "Resource set", value: "RESOURCE_SET" },
];

const SCOPE_TARGET_OPTIONS: Record<string, { label: string; value: string }[]> = {
  GROUP: [{ label: "Học Toán 12", value: "g-1" }],
  SUBJECT: [{ label: "Toán", value: "math" }],
  RESOURCE_SET: [{ label: "Bộ Toán 12", value: "rs-1" }],
};

export function ExpandGrantsModal({ open, onClose, onConfirm, confirmLoading }: ExpandGrantsModalProps) {
  const [scopeType, setScopeType] = useState<string>("GROUP");
  const [scopeId, setScopeId] = useState<string>("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState<dayjs.Dayjs | null>(null);
  const [reason, setReason] = useState("");
  const { data: grantable } = useGrantablePermissions();

  const availablePermissions = useMemo(() => {
    if (!grantable) return [];
    return grantable.filter((p) => p.scopeTypes.includes(scopeType));
  }, [grantable, scopeType]);

  const handleOk = () => {
    if (!scopeId || selectedPerms.length === 0 || !expiresAt || !reason.trim()) return;
    const scopeName = SCOPE_TARGET_OPTIONS[scopeType].find((s) => s.value === scopeId)?.label ?? scopeId;
    onConfirm([{ scopeType, scopeId, scopeName }], selectedPerms, expiresAt.toISOString(), reason.trim());
  };

  return (
    <Modal
      open={open}
      title="Mở rộng quyền CTV"
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      okText="Mở rộng"
      cancelText="Huỷ"
      okButtonProps={{ disabled: !scopeId || selectedPerms.length === 0 || !expiresAt || !reason.trim() }}
      afterClose={() => { setScopeId(""); setSelectedPerms([]); setExpiresAt(null); setReason(""); }}
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Space>
          <Select value={scopeType} options={SCOPE_TYPE_OPTIONS} onChange={setScopeType} style={{ width: 160 }} />
          <Select
            value={scopeId || undefined}
            placeholder="Chọn scope"
            options={SCOPE_TARGET_OPTIONS[scopeType]}
            onChange={setScopeId}
            style={{ width: 200 }}
          />
        </Space>
        <Select
          mode="multiple"
          placeholder="Chọn quyền"
          options={availablePermissions.map((p) => ({ label: `${p.key} — ${p.description}`, value: p.key }))}
          value={selectedPerms}
          onChange={setSelectedPerms}
          style={{ width: "100%" }}
        />
        <DatePicker
          showTime
          placeholder="Hạn grant"
          value={expiresAt}
          onChange={setExpiresAt}
          disabledDate={(d) => d.isBefore(dayjs(), "day")}
          style={{ width: "100%" }}
        />
        <Input.TextArea
          placeholder="Lý do mở rộng (bắt buộc)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
        {scopeId && selectedPerms.length > 0 && expiresAt && (
          <Typography.Text type="secondary">
            Thêm {selectedPerms.length} quyền trên {scopeType}:{scopeId}, hết hạn {expiresAt.format("DD/MM/YYYY HH:mm")}.
          </Typography.Text>
        )}
      </Space>
    </Modal>
  );
}
