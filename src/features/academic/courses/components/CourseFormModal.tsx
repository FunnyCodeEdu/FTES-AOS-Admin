import { useEffect } from "react";
import { Input, Modal, Form, Select } from "antd";
import { SubjectSelect } from "../../components/SubjectSelect";
import type { Course, CourseFormValues } from "../../types";

interface CourseFormModalProps {
  open: boolean;
  course?: Course | null;
  onClose: () => void;
  onSubmit: (values: CourseFormValues) => void;
  isSubmitting?: boolean;
}

export function CourseFormModal({ open, course, onClose, onSubmit, isSubmitting }: CourseFormModalProps) {
  const [form] = Form.useForm<CourseFormValues>();
  const isEdit = Boolean(course);

  useEffect(() => {
    if (open) {
      form.setFieldsValue(
        course ?? {
          subjectId: "",
          name: "",
          summary: "",
          saleMode: "LEGACY",
        }
      );
    }
  }, [open, course, form]);

  return (
    <Modal
      title={isEdit ? "Sửa khoá học" : "Tạo khoá học"}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={isSubmitting}
      okText={isEdit ? "Lưu" : "Tạo"}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item
          name="subjectId"
          label="Môn học"
          rules={[{ required: true, message: "Chọn môn học" }]}
        >
          <SubjectSelect placeholder="Chọn môn học" disabled={isEdit} />
        </Form.Item>
        <Form.Item
          name="name"
          label="Tên khoá học"
          rules={[{ required: true, message: "Vui lòng nhập tên khoá học" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="summary" label="Tóm tắt">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="saleMode" label="Loại khoá học" rules={[{ required: true }]}>
          <Select
            placeholder="Chọn loại"
            disabled={isEdit}
            options={[
              { value: "LEGACY", label: "LEGACY" },
              { value: "PACKAGE", label: "PACKAGE" },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
