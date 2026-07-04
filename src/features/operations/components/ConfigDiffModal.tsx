import { Form, Input, Modal, Space, Typography } from "antd";
import type { ConfigEntry, ConfigValueType } from "../shared/types";

interface ConfigDiffModalProps {
  open: boolean;
  entry: ConfigEntry | null;
  newValue: unknown;
  newType: ConfigValueType;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  confirmLoading?: boolean;
}

function formatValue(value: unknown, type: ConfigValueType): string {
  if (type === "json") return JSON.stringify(value, null, 2);
  return String(value);
}

export function ConfigDiffModal({ open, entry, newValue, newType, onClose, onConfirm, confirmLoading }: ConfigDiffModalProps) {
  const [form] = Form.useForm();

  const handleOk = () => {
    form.validateFields().then(({ reason }) => onConfirm(reason));
  };

  return (
    <Modal
      open={open}
      title="Xác nhận thay đổi cấu hình"
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      okText="Lưu"
      cancelText="Huỷ"
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Typography.Text>
          Key: <strong>{entry?.key}</strong>
        </Typography.Text>
        <Space align="start">
          <div style={{ width: 200 }}>
            <Typography.Text type="secondary">Trước</Typography.Text>
            <pre style={{ background: "#f5f5f5", padding: 8, borderRadius: 4 }}>{entry ? formatValue(entry.value, entry.type) : "—"}</pre>
          </div>
          <div style={{ width: 200 }}>
            <Typography.Text type="secondary">Sau</Typography.Text>
            <pre style={{ background: "#f6ffed", padding: 8, borderRadius: 4 }}>{formatValue(newValue, newType)}</pre>
          </div>
        </Space>
        <Form form={form} layout="vertical">
          <Form.Item
            label="Lý do thay đổi (bắt buộc)"
            name="reason"
            rules={[{ required: true, message: "Vui lòng nhập lý do" }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Space>
    </Modal>
  );
}
