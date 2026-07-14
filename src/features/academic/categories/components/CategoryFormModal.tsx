import { useEffect } from "react";
import { Form, Input, Modal } from "antd";
import type { FormInstance } from "antd";
import type { CategoryFormValues, CourseCategory } from "../types";

interface CategoryFormModalProps {
  open: boolean;
  category?: CourseCategory | null;
  onClose: () => void;
  onSubmit: (values: CategoryFormValues) => void;
  isSubmitting?: boolean;
  /** Passed from the page so slug 409 (SLUG_TAKEN) can be surfaced on the field. */
  form: FormInstance<CategoryFormValues>;
}

export function CategoryFormModal({
  open,
  category,
  onClose,
  onSubmit,
  isSubmitting,
  form,
}: CategoryFormModalProps) {
  const isEdit = Boolean(category);

  useEffect(() => {
    if (open) {
      form.setFieldsValue(
        category
          ? { name: category.name, slug: category.slug, description: category.description ?? "" }
          : { name: "", slug: "", description: "" }
      );
    }
  }, [open, category, form]);

  return (
    <Modal
      title={isEdit ? "Sửa danh mục" : "Tạo danh mục"}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={isSubmitting}
      okText={isEdit ? "Lưu" : "Tạo"}
      cancelText="Huỷ"
    >
      <Form form={form} layout="vertical" onFinish={(values) => onSubmit(values as CategoryFormValues)}>
        <Form.Item
          name="name"
          label="Tên danh mục"
          rules={[{ required: true, message: "Vui lòng nhập tên danh mục" }]}
        >
          <Input placeholder="VD: Luyện thi THPT" />
        </Form.Item>
        <Form.Item name="slug" label="Slug" extra="Để trống sẽ tự sinh từ tên.">
          <Input placeholder="luyen-thi-thpt" />
        </Form.Item>
        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
