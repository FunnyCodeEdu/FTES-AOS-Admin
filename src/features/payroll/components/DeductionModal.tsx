import { useEffect } from "react";
import { Form, Input, InputNumber, Modal } from "antd";
import type { DeductionInput, PayrollDeduction } from "../types";

interface DeductionModalProps {
  open: boolean;
  editing: PayrollDeduction | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (values: DeductionInput) => void;
}

/** Modal thêm/sửa khoản trừ `{type, amount, description}` (mirror legacy expense modal). */
export function DeductionModal({ open, editing, submitting, onCancel, onSubmit }: DeductionModalProps) {
  const [form] = Form.useForm<DeductionInput>();

  useEffect(() => {
    if (open) {
      if (editing) {
        form.setFieldsValue({
          type: editing.type,
          amount: editing.amount,
          description: editing.description,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, editing, form]);

  const handleOk = () => {
    form.validateFields().then((values) => onSubmit(values));
  };

  return (
    <Modal
      title={editing ? "Cập nhật khoản trừ" : "Thêm khoản trừ"}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={submitting}
      okText={editing ? "Cập nhật" : "Thêm"}
      cancelText="Huỷ"
      destroyOnClose
      width={520}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="type"
          label="Loại khoản trừ"
          rules={[{ required: true, message: "Vui lòng nhập loại khoản trừ" }]}
        >
          <Input placeholder="Ví dụ: Tạm ứng, Phạt trễ hạn" />
        </Form.Item>
        <Form.Item name="description" label="Mô tả">
          <Input placeholder="Mô tả chi tiết (tuỳ chọn)" />
        </Form.Item>
        <Form.Item
          name="amount"
          label="Số tiền"
          rules={[{ required: true, message: "Vui lòng nhập số tiền" }]}
        >
          <InputNumber<number>
            style={{ width: "100%" }}
            min={0}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            parser={(value) => Number((value ?? "").replace(/,/g, ""))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
