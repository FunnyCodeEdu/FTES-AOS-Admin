import { useEffect, useState } from "react";
import { Drawer, Form, Input, InputNumber, Radio, message } from "antd";
import { useCreateProduct, useUpdateProduct } from "../api/catalog.api";
import type { Product, ProductStatus, ProductType } from "../../shared/types";

interface ProductFormDrawerProps {
  open: boolean;
  product?: Product | null;
  onClose: () => void;
}

const TYPE_OPTIONS: { label: string; value: ProductType }[] = [
  { label: "Merchandise", value: "merchandise" },
  { label: "Premium", value: "premium" },
  { label: "AI Credits", value: "ai_credits" },
  { label: "Voucher", value: "voucher" },
  { label: "Course Unlock", value: "course_unlock" },
];

const STATUS_OPTIONS: { label: string; value: ProductStatus }[] = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Draft", value: "draft" },
];

export function ProductFormDrawer({ open, product, onClose }: ProductFormDrawerProps) {
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const [form] = Form.useForm();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = !!product;

  useEffect(() => {
    if (open) {
      if (product) form.setFieldsValue(product);
      else form.resetFields();
      setSubmitError(null);
    }
  }, [open, product, form]);

  function handleSubmit() {
    setSubmitError(null);
    form.validateFields().then((values) => {
      if (isEdit && product) {
        update.mutate(
          { ...product, ...values },
          {
            onSuccess: () => {
              message.success("Đã cập nhật sản phẩm");
              onClose();
            },
            onError: (err) => setSubmitError(err.message),
          }
        );
      } else {
        create.mutate(values, {
          onSuccess: () => {
            message.success("Đã tạo sản phẩm");
            onClose();
          },
          onError: (err) => setSubmitError(err.message),
        });
      }
    });
  }

  return (
    <Drawer
      open={open}
      title={isEdit ? "Sửa sản phẩm" : "Tạo sản phẩm"}
      width={480}
      onClose={onClose}
      destroyOnClose
      extra={
        <Radio.Group>
          <Radio.Button onClick={handleSubmit}>Lưu</Radio.Button>
        </Radio.Group>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="Tên sản phẩm" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="type" label="Loại" rules={[{ required: true }]} initialValue="merchandise">
          <Radio.Group options={TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]} initialValue="draft">
          <Radio.Group options={STATUS_OPTIONS} />
        </Form.Item>
        <Form.Item name="basePrice" label="Giá" rules={[{ required: true }]}>
          <InputNumber style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={3} />
        </Form.Item>
        {submitError && <Form.Item><span style={{ color: "red" }}>{submitError}</span></Form.Item>}
      </Form>
    </Drawer>
  );
}
