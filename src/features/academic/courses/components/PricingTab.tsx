import { useEffect } from "react";
import { Button, Card, Form, Input, InputNumber, Space, Typography, message } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Can } from "../../../../shared/permissions";
import type { CourseDetail, CoursePackage } from "../../types";
import { useUpdateCoursePricing } from "../api/courses.api";

interface PricingTabProps {
  course: CourseDetail;
  readOnly?: boolean;
}

export function PricingTab({ course, readOnly }: PricingTabProps) {
  const [form] = Form.useForm<{ basePrice: number; packages: CoursePackage[] }>();
  const update = useUpdateCoursePricing(course.id);

  useEffect(() => {
    form.setFieldsValue({
      basePrice: course.basePrice ?? 0,
      packages: course.packages ?? [],
    });
  }, [course, form]);

  const handleSave = () => {
    form.validateFields().then((values) => {
      update.mutate(values, {
        onSuccess: () => message.success("Đã cập nhật pricing"),
        onError: (err: Error) => message.error(err.message || "Lưu thất bại"),
      });
    });
  };

  return (
    <div>
      <Typography.Title level={5}>Giá &amp; gói</Typography.Title>
      <Form form={form} layout="vertical">
        <Form.Item name="basePrice" label="Giá gốc" rules={[{ required: true }]}>
          <InputNumber disabled={readOnly} style={{ width: 200 }} min={0} formatter={(v) => `${v}đ`} />
        </Form.Item>

        <Typography.Text strong>Gói học tập</Typography.Text>
        <Form.List name="packages">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Card key={key} size="small" style={{ marginBottom: 12 }}>
                  <Space align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, "name"]}
                      rules={[{ required: true, message: "Nhập tên gói" }]}
                    >
                      <Input placeholder="Tên gói" disabled={readOnly} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "price"]}
                      rules={[{ required: true, message: "Nhập giá" }]}
                    >
                      <InputNumber placeholder="Giá" min={0} disabled={readOnly} />
                    </Form.Item>
                    <Can permissions={["course.manage"]}>
                      {!readOnly && <MinusCircleOutlined onClick={() => remove(name)} />}
                    </Can>
                  </Space>
                  <Form.Item {...restField} name={[name, "entitlements"]} style={{ marginBottom: 0 }}>
                    <Input.TextArea
                      disabled={readOnly}
                      placeholder="Entitlements (JSON hoặc mô tả)"
                      rows={2}
                    />
                  </Form.Item>
                </Card>
              ))}
              <Can permissions={["course.manage"]}>
                {!readOnly && (
                  <Button type="dashed" onClick={() => add({ name: "", price: 0, entitlements: [] })} icon={<PlusOutlined />}>
                    Thêm gói
                  </Button>
                )}
              </Can>
            </>
          )}
        </Form.List>

        <Can permissions={["course.manage"]}>
          {!readOnly && (
            <Button type="primary" onClick={handleSave} loading={update.isPending} style={{ marginTop: 16 }}>
              Lưu pricing
            </Button>
          )}
        </Can>
      </Form>
    </div>
  );
}
