import { useEffect } from "react";
import { Button, Form, Input, Space, Typography, message } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Can } from "../../../../shared/permissions";
import type { LearningOutcome, SubjectDetail } from "../../types";
import { useUpdateSubject } from "../api/subjects.api";

interface OutcomesTabProps {
  subject: SubjectDetail;
}

export function OutcomesTab({ subject }: OutcomesTabProps) {
  const [form] = Form.useForm<{ outcomes: LearningOutcome[] }>();
  const update = useUpdateSubject(subject.id);

  useEffect(() => {
    form.setFieldsValue({ outcomes: subject.outcomes ?? [] });
  }, [subject.outcomes, form]);

  const handleSave = () => {
    const values = form.getFieldsValue();
    update.mutate(
      {
        code: subject.code,
        name: subject.name,
        description: subject.description,
        status: subject.status,
        outcomes: values.outcomes.map((o, idx) => ({ ...o, order: idx + 1 })),
      },
      {
        onSuccess: () => message.success("Đã cập nhật learning outcomes"),
        onError: (err: Error) => message.error(err.message || "Lưu thất bại"),
      }
    );
  };

  return (
    <div>
      <Typography.Title level={5}>Learning outcomes</Typography.Title>
      <Can permissions={["subject.update"]}>
        <Typography.Paragraph type="secondary">
          Chỉnh sửa danh sách outcome và bấm Lưu.
        </Typography.Paragraph>
      </Can>
      <Form form={form} layout="vertical">
        <Form.List name="outcomes">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} align="baseline" style={{ display: "flex", marginBottom: 8 }}>
                  <Form.Item
                    {...restField}
                    name={[name, "description"]}
                    rules={[{ required: true, message: "Nhập outcome" }]}
                    style={{ flex: 1, marginBottom: 0, minWidth: 400 }}
                  >
                    <Input placeholder="Sau khi hoàn thành môn học, học viên có thể..." />
                  </Form.Item>
                  <Can permissions={["subject.update"]}>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Can>
                </Space>
              ))}
              <Can permissions={["subject.update"]}>
                <Button type="dashed" onClick={() => add({ description: "" })} icon={<PlusOutlined />}>
                  Thêm outcome
                </Button>
              </Can>
            </>
          )}
        </Form.List>
      </Form>
      <Can permissions={["subject.update"]}>
        <Button type="primary" onClick={handleSave} loading={update.isPending} style={{ marginTop: 16 }}>
          Lưu outcomes
        </Button>
      </Can>
    </div>
  );
}
