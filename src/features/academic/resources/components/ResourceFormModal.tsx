import { useEffect } from "react";
import { Input, Modal, Form, Select } from "antd";
import { SubjectSelect } from "../../components/SubjectSelect";
import type { Resource, ResourceFormValues } from "../../types";

interface ResourceFormModalProps {
  open: boolean;
  resource?: Resource | null;
  onClose: () => void;
  onSubmit: (values: ResourceFormValues) => void;
  isSubmitting?: boolean;
  subjectLocked?: boolean;
}

export function ResourceFormModal({
  open,
  resource,
  onClose,
  onSubmit,
  isSubmitting,
  subjectLocked,
}: ResourceFormModalProps) {
  const [form] = Form.useForm<ResourceFormValues>();
  const isEdit = Boolean(resource);

  useEffect(() => {
    if (open) {
      form.setFieldsValue(
        resource ?? {
          subjectId: "",
          title: "",
          type: "other",
          license: "",
          visibility: "enrolled",
        }
      );
    }
  }, [open, resource, form]);

  return (
    <Modal
      title={isEdit ? "Sửa học liệu" : "Upload học liệu"}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={isSubmitting}
      okText={isEdit ? "Lưu" : "Upload"}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item
          name="subjectId"
          label="Môn học"
          rules={[{ required: true, message: "Chọn môn học" }]}
        >
          <SubjectSelect placeholder="Chọn môn học" disabled={isEdit || subjectLocked} />
        </Form.Item>
        <Form.Item name="title" label="Tên học liệu" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="type" label="Loại" rules={[{ required: true }]}>
          <Select
            options={[
              { value: "video", label: "Video" },
              { value: "pdf", label: "PDF" },
              { value: "slide", label: "Slide" },
              { value: "quiz", label: "Quiz" },
              { value: "link", label: "Link" },
              { value: "other", label: "Khác" },
            ]}
          />
        </Form.Item>
        <Form.Item name="license" label="License">
          <Input placeholder="VD: CC-BY-SA" />
        </Form.Item>
        <Form.Item name="visibility" label="Visibility" rules={[{ required: true }]}>
          <Select
            options={[
              { value: "public", label: "Công khai" },
              { value: "enrolled", label: "Học viên đăng ký" },
              { value: "package_only", label: "Theo gói" },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
