import { useEffect } from "react";
import { Form, Input, InputNumber, Modal, Switch } from "antd";
import type { FormInstance } from "antd";
import type { Campus, CampusFormValues } from "../types";

interface CampusFormModalProps {
  open: boolean;
  campus?: Campus | null;
  onClose: () => void;
  onSubmit: (values: CampusFormValues) => void;
  isSubmitting?: boolean;
  /** Truyền từ trang để 409 (COMMUNITY_CAMPUS_CODE_EXISTS) hiển thị lỗi trên đúng field `code`. */
  form: FormInstance<CampusFormValues>;
}

export function CampusFormModal({
  open,
  campus,
  onClose,
  onSubmit,
  isSubmitting,
  form,
}: CampusFormModalProps) {
  const isEdit = Boolean(campus);

  useEffect(() => {
    if (open) {
      form.setFieldsValue(
        campus
          ? {
              code: campus.code,
              name: campus.name,
              nameEn: campus.nameEn ?? "",
              region: campus.region ?? "",
              active: campus.active,
              sortOrder: campus.sortOrder,
            }
          : { code: "", name: "", nameEn: "", region: "", active: true, sortOrder: 0 }
      );
    }
  }, [open, campus, form]);

  return (
    <Modal
      title={isEdit ? "Sửa cơ sở" : "Tạo cơ sở"}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={isSubmitting}
      okText={isEdit ? "Lưu" : "Tạo"}
      cancelText="Huỷ"
    >
      <Form form={form} layout="vertical" onFinish={(values) => onSubmit(values as CampusFormValues)}>
        <Form.Item
          name="code"
          label="Mã cơ sở"
          rules={[{ required: true, message: "Vui lòng nhập mã cơ sở" }]}
        >
          <Input placeholder="VD: HN" />
        </Form.Item>
        <Form.Item
          name="name"
          label="Tên cơ sở"
          rules={[{ required: true, message: "Vui lòng nhập tên cơ sở" }]}
        >
          <Input placeholder="VD: Hà Nội" />
        </Form.Item>
        <Form.Item name="nameEn" label="Tên (EN)">
          <Input placeholder="VD: Hanoi" />
        </Form.Item>
        <Form.Item name="region" label="Khu vực">
          <Input placeholder="VD: Miền Bắc" />
        </Form.Item>
        <Form.Item name="active" label="Kích hoạt" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="sortOrder" label="Thứ tự hiển thị">
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
