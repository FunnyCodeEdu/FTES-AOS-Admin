import { useEffect } from "react";
import { Input, Modal, Form, Select } from "antd";
import type { Pack, PackFormValues } from "../../types";

interface PackFormModalProps {
  open: boolean;
  pack?: Pack | null;
  onClose: () => void;
  onSubmit: (values: PackFormValues) => void;
  isSubmitting?: boolean;
}

export function PackFormModal({ open, pack, onClose, onSubmit, isSubmitting }: PackFormModalProps) {
  const [form] = Form.useForm<PackFormValues>();
  const isEdit = Boolean(pack);

  useEffect(() => {
    if (open) {
      form.setFieldsValue(
        pack ?? {
          name: "",
          description: "",
          status: "draft",
        }
      );
    }
  }, [open, pack, form]);

  return (
    <Modal
      title={isEdit ? "Sửa pack" : "Tạo pack"}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={isSubmitting}
      okText={isEdit ? "Lưu" : "Tạo"}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item name="name" label="Tên pack" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
          <Select
            options={[
              { value: "active", label: "Hoạt động" },
              { value: "inactive", label: "Ngừng" },
              { value: "draft", label: "Nháp" },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
