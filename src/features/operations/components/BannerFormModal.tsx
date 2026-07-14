import { useEffect } from "react";
import { DatePicker, Form, Input, InputNumber, Modal, Select, Typography } from "antd";
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
    subtitle?: string;
    ctaText?: string;
    theme?: string;
  }) => void;
  confirmLoading?: boolean;
}

const PLACEMENT_OPTIONS: { label: string; value: BannerPlacement }[] = [
  { label: "Home Hero", value: "home-hero" },
  { label: "Sidebar", value: "sidebar" },
  { label: "Subject Top", value: "subject-top" },
];

const DEFAULT_THEME = "linear-gradient(135deg, #1677ff 0%, #6f42c1 100%)";

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
        subtitle: banner?.subtitle ?? "",
        ctaText: banner?.ctaText ?? "",
        theme: banner?.theme ?? "",
      });
    }
  }, [open, banner, form]);

  // Live preview values.
  const themeValue = Form.useWatch("theme", form);
  const titleValue = Form.useWatch("title", form);
  const subtitleValue = Form.useWatch("subtitle", form);
  const ctaValue = Form.useWatch("ctaText", form);
  const imageValue = Form.useWatch("imageUrl", form);
  const previewBackground = themeValue || DEFAULT_THEME;

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
      width={640}
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Tiêu đề" name="title" rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Phụ đề" name="subtitle">
          <Input.TextArea rows={2} maxLength={255} showCount placeholder="Mô tả ngắn hiển thị dưới tiêu đề" />
        </Form.Item>
        <Form.Item label="URL ảnh" name="imageUrl" rules={[{ required: true, message: "Vui lòng nhập URL ảnh" }]}>
          <Input placeholder="https://cdn.ftes.vn/banners/..." />
        </Form.Item>
        <Form.Item label="Link" name="linkUrl">
          <Input />
        </Form.Item>
        <Form.Item label="Nút CTA" name="ctaText">
          <Input maxLength={80} placeholder="XEM CHI TIẾT" />
        </Form.Item>
        <Form.Item
          label="Theme (CSS gradient/background)"
          name="theme"
          extra="Chuỗi CSS background, vd: linear-gradient(135deg, #1677ff, #6f42c1)"
        >
          <Input placeholder={DEFAULT_THEME} />
        </Form.Item>
        <Form.Item label="Xem trước theme">
          <div
            style={{
              background: previewBackground,
              height: 64,
              borderRadius: 8,
              border: "1px solid #f0f0f0",
            }}
          />
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

        <Form.Item label="Xem trước slide">
          <div
            style={{
              background: previewBackground,
              borderRadius: 12,
              padding: 24,
              minHeight: 140,
              display: "flex",
              alignItems: "center",
              gap: 16,
              color: "#fff",
              overflow: "hidden",
            }}
          >
            {imageValue ? (
              <img
                src={imageValue}
                alt="banner"
                style={{ height: 96, borderRadius: 8, objectFit: "cover" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : null}
            <div style={{ flex: 1 }}>
              <Typography.Title level={4} style={{ color: "#fff", margin: 0 }}>
                {titleValue || "Tiêu đề banner"}
              </Typography.Title>
              {subtitleValue ? (
                <Typography.Paragraph style={{ color: "rgba(255,255,255,0.85)", margin: "8px 0 0" }}>
                  {subtitleValue}
                </Typography.Paragraph>
              ) : null}
              {ctaValue ? (
                <span
                  style={{
                    display: "inline-block",
                    marginTop: 12,
                    padding: "6px 16px",
                    background: "#fff",
                    color: "#1f1f1f",
                    borderRadius: 999,
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  {ctaValue}
                </span>
              ) : null}
            </div>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}
