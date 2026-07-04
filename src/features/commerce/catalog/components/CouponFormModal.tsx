import { useEffect, useState } from "react";
import { DatePicker, Form, Input, InputNumber, Modal, Radio, Select, message } from "antd";
import dayjs from "dayjs";
import { useCreateCoupon, useUpdateCoupon } from "../api/catalog.api";
import type { Coupon, CouponType } from "../../shared/types";

interface CouponFormModalProps {
  open: boolean;
  coupon?: Coupon | null;
  onClose: () => void;
}

const TYPE_OPTIONS: { label: string; value: CouponType }[] = [
  { label: "Phần trăm", value: "percent" },
  { label: "Cố định", value: "fixed" },
];

export function CouponFormModal({ open, coupon, onClose }: CouponFormModalProps) {
  const create = useCreateCoupon();
  const update = useUpdateCoupon();
  const [form] = Form.useForm();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = !!coupon;

  useEffect(() => {
    if (open) {
      if (coupon) {
        form.setFieldsValue({
          ...coupon,
          validFrom: coupon.validFrom ? dayjs(coupon.validFrom) : null,
          validTo: coupon.validTo ? dayjs(coupon.validTo) : null,
        });
      } else {
        form.resetFields();
      }
      setSubmitError(null);
    }
  }, [open, coupon, form]);

  function handleSubmit() {
    setSubmitError(null);
    form.validateFields().then((values) => {
      const payload = {
        ...values,
        validFrom: values.validFrom?.toISOString(),
        validTo: values.validTo?.toISOString(),
      };
      if (isEdit && coupon) {
        update.mutate(
          { ...coupon, ...payload },
          {
            onSuccess: () => {
              message.success("Đã cập nhật coupon");
              onClose();
            },
            onError: (err) => setSubmitError(err.message),
          }
        );
      } else {
        create.mutate(payload, {
          onSuccess: () => {
            message.success("Đã tạo coupon");
            onClose();
          },
          onError: (err) => setSubmitError(err.message),
        });
      }
    });
  }

  return (
    <Modal
      open={open}
      title={isEdit ? "Sửa coupon" : "Tạo coupon"}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={create.isPending || update.isPending}
      okText="Lưu"
      cancelText="Huỷ"
    >
      <Form form={form} layout="vertical">
        <Form.Item name="code" label="Mã coupon" rules={[{ required: true }]}>
          <Input placeholder="VD: SUMMER2026" />
        </Form.Item>
        <Form.Item name="type" label="Loại" rules={[{ required: true }]} initialValue="percent">
          <Radio.Group options={TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item name="value" label="Giá trị" rules={[{ required: true }]}>
          <InputNumber style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="maxUses" label="Số lần sử dụng tối đa">
          <InputNumber style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="perUserLimit" label="Giới hạn mỗi user">
          <InputNumber style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="validFrom" label="Hiệu lực từ">
          <DatePicker showTime style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="validTo" label="Hiệu lực đến">
          <DatePicker showTime style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="appliesTo" label="Áp dụng cho">
          <Select mode="tags" placeholder="Nhập loại sản phẩm" />
        </Form.Item>
        {submitError && <Form.Item><span style={{ color: "red" }}>{submitError}</span></Form.Item>}
      </Form>
    </Modal>
  );
}
