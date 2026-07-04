import { useEffect } from "react";
import { DatePicker, Form, Input, InputNumber, Modal, Select } from "antd";
import dayjs from "dayjs";
import type { Banner, BannerPlacement } from "../shared/types";

interface BannerFormModalProps {
  open: boolean;
  banner?: Banner | null;
  onClose: () => void;
  onSubmit: (values: {
    title: string;
    imageUrl: string;
    linkUrl?: string;
    position: BannerPlacement;
    order: number;
    activeFrom?: string;
    activeTo?: string;
  }) => void;
  confirmLoading?: boolean;
}

const PLACEMENT_OPTIONS: { label: string; value: BannerPlacement }[] = [
  { label: "Home Hero", value: "home-hero" },
  { label: "Sidebar", value: "sidebar" },
  { label: "Subject Top", value: "subject-top" },
];

export function BannerFormModal({ open, banner, onClose, onSubmit, confirmLoading }: BannerFormModalProps) {
  const [form] = Form.useForm();
  const isEdit = !!banner;

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        title: banner?.title ?? "",
        imageUrl: banner?.imageUrl ?? "",
        linkUrl: banner?.linkUrl ?? "",
        position: banner?.position ?? "home-hero",
        order: banner?.order ?? 1,
        activeFrom: banner?.activeFrom ? dayjs(banner.activeFrom) : null,
        activeTo: banner?.activeTo ? dayjs(banner.activeTo) : null,
      });
    }
  }, [open, banner, form]);

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
      title={isEdit ? "Sửa banner" : "Tạo banner"}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      okText={isEdit ? "Lưu" : "Tạo"}
      cancelText="Huỷ"
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Tiêu đề" name="title" rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}>
          <Input />
        </Form.Item>
        <Form.Item label="URL ảnh" name="imageUrl" rules={[{ required: true, message: "Vui lòng nhập URL ảnh" }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Link" name="linkUrl">
          <Input />
        </Form.Item>
        <Form.Item label="Vị trí" name="position" rules={[{ required: true }]}>
          <Select options={PLACEMENT_OPTIONS} />
        </Form.Item>
        <Form.Item label="Thứ tự" name="order" rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
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
