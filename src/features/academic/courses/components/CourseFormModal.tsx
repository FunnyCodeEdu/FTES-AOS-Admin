import { useEffect } from "react";
import { Input, Modal, Form, Select } from "antd";
import { SubjectSelect } from "../../components/SubjectSelect";
import type { Course, CourseFormValues, CourseType } from "../../types";

interface CourseFormModalProps {
  open: boolean;
  course?: Course | null;
  onClose: () => void;
  onSubmit: (values: CourseFormValues) => void;
  isSubmitting?: boolean;
}

export interface SaleModeOption {
  value: CourseType;
  label: string;
  disabled?: boolean;
}

/**
 * Options ô "Loại khoá học" (admin-course-management-refinements §5.4).
 * - Tạo mới: BE LUÔN tạo LEGACY (CourseCommandApiImpl hardcode, body create không nhận saleMode)
 *   → PACKAGE bị mờ, kẻo UI hứa suông một lựa chọn không có tác dụng.
 * - Sửa khoá PACKAGE: LEGACY bị mờ — BE chặn hạ cấp (COURSE_TYPE_DOWNGRADE_FORBIDDEN), chặn ngay
 *   từ UI để admin không phải ăn lỗi.
 * - Sửa khoá LEGACY: được nâng lên PACKAGE (BE tự tạo gói mặc định "Trọn khoá" + backfill học viên).
 */
export function saleModeOptions(current: CourseType | undefined, isEdit: boolean): SaleModeOption[] {
  return [
    { value: "LEGACY", label: "LEGACY", disabled: isEdit && current === "PACKAGE" },
    { value: "PACKAGE", label: "PACKAGE", disabled: !isEdit },
  ];
}

/** Câu giải thích dưới ô loại — nói rõ vì sao option còn lại bị mờ. */
export function saleModeHint(current: CourseType | undefined, isEdit: boolean): string {
  if (!isEdit) {
    return "Khoá mới luôn tạo ở dạng LEGACY — thêm chương/bài học xong mới nâng lên PACKAGE.";
  }
  if (current === "PACKAGE") {
    return "Khoá PACKAGE không thể chuyển về LEGACY.";
  }
  return 'Nâng lên PACKAGE sẽ tạo gói mặc định "Trọn khoá" và KHÔNG thể chuyển ngược về LEGACY (khoá cần có ít nhất 1 chương).';
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
        <Form.Item
          name="saleMode"
          label="Loại khoá học"
          rules={[{ required: true }]}
          extra={saleModeHint(course?.saleMode, isEdit)}
        >
          <Select placeholder="Chọn loại" options={saleModeOptions(course?.saleMode, isEdit)} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
