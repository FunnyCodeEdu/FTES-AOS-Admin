import { DatePicker, Form, Input, InputNumber, Modal, Radio, Select, Switch } from "antd";
import type { OfficialEventMode, OfficialEventType } from "../shared/types";

interface EventWizardModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: {
    type: OfficialEventType;
    title: string;
    description?: string;
    schedule: { startAt: string; endAt?: string };
    mode: OfficialEventMode;
    capacity?: number;
    location?: string;
    onlineLink?: string;
    certificateConfig?: { enabled: boolean; templateId?: string };
    rewardConfig?: { enabled: boolean; points?: number };
  }) => void;
  confirmLoading?: boolean;
}

const TYPE_OPTIONS: { label: string; value: OfficialEventType }[] = [
  { label: "Webinar", value: "webinar" },
  { label: "Workshop", value: "workshop" },
  { label: "Hackathon", value: "hackathon" },
];

export function EventWizardModal({ open, onClose, onSubmit, confirmLoading }: EventWizardModalProps) {
  const [form] = Form.useForm();
  const mode = Form.useWatch("mode", form);
  const certEnabled = Form.useWatch(["certificateConfig", "enabled"], form);
  const rewardEnabled = Form.useWatch(["rewardConfig", "enabled"], form);

  const handleOk = () => {
    form.validateFields().then((values) => {
      onSubmit({
        ...values,
        schedule: {
          startAt: values.startAt?.toISOString(),
          endAt: values.endAt?.toISOString(),
        },
      });
      form.resetFields();
    });
  };

  return (
    <Modal
      open={open}
      title="Tạo event vận hành"
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      okText="Tạo"
      cancelText="Huỷ"
      width={640}
    >
      <Form form={form} layout="vertical" initialValues={{ type: "webinar", mode: "online", certificateConfig: { enabled: false }, rewardConfig: { enabled: false } }}>
        <Form.Item label="Loại" name="type" rules={[{ required: true }]}>
          <Select options={TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item label="Tiêu đề" name="title" rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Mô tả" name="description">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item label="Time bắt đầu" name="startAt" rules={[{ required: true, message: "Vui lòng chọn time bắt đầu" }]}>
          <DatePicker showTime style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="Time kết thúc" name="endAt">
          <DatePicker showTime style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="Hình thức" name="mode" rules={[{ required: true }]}>
          <Radio.Group>
            <Radio value="online">Online</Radio>
            <Radio value="offline">Offline</Radio>
          </Radio.Group>
        </Form.Item>
        {mode === "offline" && (
          <Form.Item label="Địa điểm" name="location" rules={[{ required: true, message: "Vui lòng nhập địa điểm" }]}>
            <Input />
          </Form.Item>
        )}
        {mode === "online" && (
          <Form.Item label="Link online" name="onlineLink" rules={[{ required: true, message: "Vui lòng nhập link" }]}>
            <Input />
          </Form.Item>
        )}
        <Form.Item label="Sức chứa" name="capacity">
          <InputNumber min={1} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="Cấp certificate">
          <Form.Item name={["certificateConfig", "enabled"]} valuePropName="checked" noStyle>
            <Switch />
          </Form.Item>
        </Form.Item>
        {certEnabled && (
          <Form.Item label="Template ID" name={["certificateConfig", "templateId"]}>
            <Input />
          </Form.Item>
        )}
        <Form.Item label="Cấp reward">
          <Form.Item name={["rewardConfig", "enabled"]} valuePropName="checked" noStyle>
            <Switch />
          </Form.Item>
        </Form.Item>
        {rewardEnabled && (
          <Form.Item label="Điểm thưởng" name={["rewardConfig", "points"]} rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
