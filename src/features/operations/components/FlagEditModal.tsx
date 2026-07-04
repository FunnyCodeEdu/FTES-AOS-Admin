import { useState } from "react";
import { Alert, Checkbox, Form, Input, InputNumber, Modal, Typography, message } from "antd";
import type { BroadcastSegment, Flag, FlagEnv } from "../shared/types";

interface FlagEditModalProps {
  open: boolean;
  flag?: Flag | null;
  env: FlagEnv;
  onClose: () => void;
  onConfirm: (values: {
    enabled: boolean;
    rolloutPercent: number;
    targetSegment?: BroadcastSegment;
    reason: string;
  }) => void;
  confirmLoading?: boolean;
}

export function FlagEditModal({ open, flag, env, onClose, onConfirm, confirmLoading }: FlagEditModalProps) {
  const [form] = Form.useForm();
  const [acknowledged, setAcknowledged] = useState(false);
  const isProd = env === "prod";

  const handleOk = () => {
    form.validateFields().then((values) => {
      const rawSegment: string | undefined = values.targetSegment;
      let targetSegment: BroadcastSegment | undefined;
      if (rawSegment && rawSegment.trim()) {
        try {
          const parsed = JSON.parse(rawSegment) as BroadcastSegment;
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            targetSegment = parsed;
          } else {
            throw new Error("Invalid segment shape");
          }
        } catch {
          message.error("Target segment không phải JSON hợp lệ");
          return;
        }
      }
      onConfirm({
        enabled: values.enabled,
        rolloutPercent: Number(values.rolloutPercent),
        targetSegment,
        reason: values.reason,
      });
    });
  };

  return (
    <Modal
      open={open}
      title={`Cập nhật flag ${flag?.key} — ${env}`}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      okText="Lưu"
      cancelText="Huỷ"
      okButtonProps={{ disabled: isProd && !acknowledged }}
      afterClose={() => {
        form.resetFields();
        setAcknowledged(false);
      }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          enabled: flag?.envs[env].enabled ?? false,
          rolloutPercent: flag?.envs[env].rolloutPercent ?? 0,
          targetSegment: flag?.envs[env].targetSegment,
          reason: "",
        }}
      >
        {isProd && (
          <Alert
            type="warning"
            message="Thay đổi trên Production"
            description="Thay đổi này sẽ áp dụng ngay trên production và ảnh hưởng đến user thật."
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        <Form.Item label="Bật flag" name="enabled" valuePropName="checked">
          <Checkbox />
        </Form.Item>
        <Form.Item
          label="Rollout %"
          name="rolloutPercent"
          rules={[
            { required: true, message: "Vui lòng nhập rollout" },
            { type: "number", min: 0, max: 100, message: "Rollout phải từ 0 đến 100" },
          ]}
        >
          <InputNumber min={0} max={100} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="Target segment (JSON, tùy chọn)" name="targetSegment">
          <Input.TextArea rows={2} placeholder='{"roles":["student"]}' />
        </Form.Item>
        <Form.Item
          label="Lý do thay đổi"
          name="reason"
          rules={[{ required: true, message: "Vui lòng nhập lý do" }]}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
        {isProd && (
          <Form.Item>
            <Checkbox checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)}>
              <Typography.Text type="danger">Tôi hiểu thay đổi áp dụng ngay trên production</Typography.Text>
            </Checkbox>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
