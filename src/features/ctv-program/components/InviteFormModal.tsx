import { useMemo, useState } from "react";
import { DatePicker, Form, Input, Modal, Select, Space, Typography } from "antd";
import dayjs from "dayjs";
import { useGrantablePermissions } from "../api/grantablePermissions.api";
import type { CtvScopeRef } from "../shared/types";

interface InviteFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: {
    email: string;
    scopes: CtvScopeRef[];
    permissions: string[];
    grantExpiresAt: string;
    note?: string;
  }) => void;
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

export function InviteFormModal({ open, onClose, onSubmit, confirmLoading }: InviteFormModalProps) {
  const [form] = Form.useForm();
  const [scopeType, setScopeType] = useState<string>("GROUP");
  const [scopeId, setScopeId] = useState<string>("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const { data: grantable } = useGrantablePermissions();

  const availablePermissions = useMemo(() => {
    if (!grantable) return [];
    return grantable.filter((p) => p.scopeTypes.includes(scopeType));
  }, [grantable, scopeType]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      const scopeName = SCOPE_TARGET_OPTIONS[scopeType].find((s) => s.value === scopeId)?.label ?? scopeId;
      onSubmit({
        email: values.email,
        scopes: [{ scopeType, scopeId, scopeName }],
        permissions: selectedPerms,
        grantExpiresAt: values.grantExpiresAt.toISOString(),
        note: values.note,
      });
    });
  };

  return (
    <Modal
      open={open}
      title="Invite CTV"
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      okText="Gửi invitation"
      cancelText="Huỷ"
      width={640}
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Email" name="email" rules={[{ required: true, type: "email", message: "Vui lòng nhập email" }]}>
          <Input />
        </Form.Item>
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
        <Form.Item label="Quyền" style={{ marginTop: 16 }}>
          <Select
            mode="multiple"
            placeholder="Chọn quyền"
            options={availablePermissions.map((p) => ({ label: `${p.key} — ${p.description}`, value: p.key }))}
            value={selectedPerms}
            onChange={setSelectedPerms}
            style={{ width: "100%" }}
          />
        </Form.Item>
        <Form.Item label="Hạn grant" name="grantExpiresAt" rules={[{ required: true, message: "Vui lòng chọn hạn" }]}>
          <DatePicker showTime disabledDate={(d) => d.isBefore(dayjs(), "day")} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="Ghi chú" name="note">
          <Input.TextArea rows={2} />
        </Form.Item>
        {selectedPerms.length > 0 && (
          <Typography.Paragraph>
            Preview: Invite <strong>{form.getFieldValue("email") || "—"}</strong> làm CTV scope{" "}
            <strong>{scopeType}:{scopeId}</strong> với {selectedPerms.length} quyền.
          </Typography.Paragraph>
        )}
      </Form>
    </Modal>
  );
}
