import { useEffect } from "react";
import { Input, Modal, Form, Select } from "antd";
import type { Subject, SubjectFormValues } from "../../types";

interface SubjectFormModalProps {
  open: boolean;
  subject?: Subject | null;
  onClose: () => void;
  onSubmit: (values: SubjectFormValues) => void;
  isSubmitting?: boolean;
}

export function SubjectFormModal({ open, subject, onClose, onSubmit, isSubmitting }: SubjectFormModalProps) {
  const [form] = Form.useForm<SubjectFormValues>();
  const isEdit = Boolean(subject);

  useEffect(() => {
    if (open) {
      form.setFieldsValue(
        subject ?? {
          code: "",
          name: "",
          description: "",
          status: "draft",
        }
      );
    }
  }, [open, subject, form]);

  return (
    <Modal
      title={isEdit ? "Sửa môn học" : "Tạo môn học"}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={isSubmitting}
      okText={isEdit ? "Lưu" : "Tạo"}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => onSubmit(values as SubjectFormValues)}
      >
        <Form.Item
          name="code"
          label="Mã môn"
          rules={[{ required: true, message: "Vui lòng nhập mã môn" }]}
        >
          <Input placeholder="VD: MAT101" />
        </Form.Item>
        <Form.Item
          name="name"
          label="Tên môn"
          rules={[{ required: true, message: "Vui lòng nhập tên môn" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item
          name="status"
          label="Trạng thái"
          rules={[{ required: true }]}
        >
          <Select
            options={[
              { value: "active", label: "Đang hoạt động" },
              { value: "inactive", label: "Ngừng hoạt động" },
              { value: "draft", label: "Bản nháp" },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
