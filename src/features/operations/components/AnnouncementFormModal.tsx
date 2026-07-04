import { useEffect } from "react";
import { DatePicker, Form, Input, Modal, Select } from "antd";
import dayjs from "dayjs";
import type { Announcement, AnnouncementLevel, AnnouncementScopeType } from "../shared/types";

interface AnnouncementFormModalProps {
  open: boolean;
  announcement?: Announcement | null;
  onClose: () => void;
  onSubmit: (values: {
    content: string;
    level: AnnouncementLevel;
    scopeType: AnnouncementScopeType;
    scopeId?: string;
    activeFrom?: string;
    activeTo?: string;
  }) => void;
  confirmLoading?: boolean;
}

const LEVEL_OPTIONS: { label: string; value: AnnouncementLevel }[] = [
  { label: "Info", value: "info" },
  { label: "Warning", value: "warning" },
  { label: "Critical", value: "critical" },
];

const SCOPE_OPTIONS: { label: string; value: AnnouncementScopeType }[] = [
  { label: "Toàn hệ thống", value: "system" },
  { label: "Môn học", value: "subject" },
  { label: "Group", value: "group" },
];

const SUBJECT_OPTIONS = [
  { label: "Toán", value: "math" },
  { label: "Ngữ văn", value: "literature" },
  { label: "Tiếng Anh", value: "english" },
];

const GROUP_OPTIONS = [
  { label: "Học Toán 12", value: "g-1" },
];

export function AnnouncementFormModal({ open, announcement, onClose, onSubmit, confirmLoading }: AnnouncementFormModalProps) {
  const [form] = Form.useForm();
  const isEdit = !!announcement;
  const scopeType = Form.useWatch("scopeType", form);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        content: announcement?.content ?? "",
        level: announcement?.level ?? "info",
        scopeType: announcement?.scopeType ?? "system",
        scopeId: announcement?.scopeId,
        activeFrom: announcement?.activeFrom ? dayjs(announcement.activeFrom) : null,
        activeTo: announcement?.activeTo ? dayjs(announcement.activeTo) : null,
      });
    }
  }, [open, announcement, form]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      onSubmit({
        ...values,
        activeFrom: values.activeFrom?.toISOString(),
        activeTo: values.activeTo?.toISOString(),
      });
    });
  };

  return (
    <Modal
      open={open}
      title={isEdit ? "Sửa announcement" : "Tạo announcement"}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      okText={isEdit ? "Lưu" : "Tạo"}
      cancelText="Huỷ"
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Nội dung" name="content" rules={[{ required: true, message: "Vui lòng nhập nội dung" }]}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item label="Mức độ" name="level" rules={[{ required: true }]}>
          <Select options={LEVEL_OPTIONS} />
        </Form.Item>
        <Form.Item label="Phạm vi" name="scopeType" rules={[{ required: true }]}>
          <Select options={SCOPE_OPTIONS} />
        </Form.Item>
        {(scopeType === "subject" || scopeType === "group") && (
          <Form.Item
            label={scopeType === "subject" ? "Môn học" : "Group"}
            name="scopeId"
            rules={[{ required: true, message: "Vui lòng chọn target" }]}
          >
            <Select options={scopeType === "subject" ? SUBJECT_OPTIONS : GROUP_OPTIONS} />
          </Form.Item>
        )}
        <Form.Item label="Hiệu lực từ" name="activeFrom">
          <DatePicker showTime style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="Hiệu lực đến" name="activeTo">
          <DatePicker showTime style={{ width: "100%" }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
