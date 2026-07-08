import { useEffect } from "react";
import { Button, Descriptions, Form, Input, Select, Typography, message } from "antd";
import { Can } from "../../../../shared/permissions";
import type { SubjectDetail, SubjectFormValues } from "../../types";
import { useUpdateSubject } from "../api/subjects.api";

interface SubjectInfoTabProps {
  subject: SubjectDetail;
}

export function SubjectInfoTab({ subject }: SubjectInfoTabProps) {
  const [form] = Form.useForm<SubjectFormValues>();
  const update = useUpdateSubject(subject.id);

  useEffect(() => {
    form.setFieldsValue({
      code: subject.code,
      name: subject.name,
      description: subject.description,
      status: subject.status,
    });
  }, [subject, form]);

  const handleSave = () => {
    form.validateFields().then((values) => {
      update.mutate(values, {
        onSuccess: () => message.success("Đã cập nhật thông tin"),
        onError: (err: Error) => message.error(err.message || "Lưu thất bại"),
      });
    });
  };

  return (
    <div>
      <Typography.Title level={5}>Thông tin chung</Typography.Title>
      <Form form={form} layout="vertical">
        <Form.Item name="code" label="Mã môn" rules={[{ required: true }]}>
          <Input disabled />
        </Form.Item>
        <Form.Item name="name" label="Tên môn" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
          <Select
            options={[
              { value: "active", label: "Đang hoạt động" },
              { value: "inactive", label: "Ngừng hoạt động" },
              { value: "draft", label: "Bản nháp" },
            ]}
          />
        </Form.Item>
        <Can permissions={["subject.manage"]}>
          <Button type="primary" onClick={handleSave} loading={update.isPending}>
            Lưu thông tin
          </Button>
        </Can>
      </Form>
      <Descriptions style={{ marginTop: 24 }} bordered column={2}>
        <Descriptions.Item label="Ngày tạo">{subject.createdAt}</Descriptions.Item>
        <Descriptions.Item label="Cập nhật">{subject.updatedAt}</Descriptions.Item>
      </Descriptions>
    </div>
  );
}
