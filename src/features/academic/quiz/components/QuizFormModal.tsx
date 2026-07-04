import { useEffect } from "react";
import { Button, Input, Modal, Form, Radio, Select, Space } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { SubjectSelect } from "../../components/SubjectSelect";
import type { QuizFormValues, QuizQuestion } from "../../types";

interface QuizFormModalProps {
  open: boolean;
  question?: QuizQuestion | null;
  onClose: () => void;
  onSubmit: (values: QuizFormValues) => void;
  isSubmitting?: boolean;
}

export function QuizFormModal({ open, question, onClose, onSubmit, isSubmitting }: QuizFormModalProps) {
  const [form] = Form.useForm<QuizFormValues>();
  const isEdit = Boolean(question);

  useEffect(() => {
    if (open) {
      form.setFieldsValue(
        question ?? {
          subjectId: "",
          content: "",
          answers: [{ id: "a", text: "", isCorrect: false }],
          correctAnswerId: "",
          tags: [],
          difficulty: "medium",
          status: "draft",
        }
      );
    }
  }, [open, question, form]);

  return (
    <Modal
      title={isEdit ? "Sửa câu hỏi" : "Tạo câu hỏi"}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={isSubmitting}
      okText={isEdit ? "Lưu" : "Tạo"}
      width={720}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item name="subjectId" label="Môn học" rules={[{ required: true }]}>
          <SubjectSelect placeholder="Chọn môn học" disabled={isEdit} />
        </Form.Item>
        <Form.Item name="content" label="Nội dung câu hỏi" rules={[{ required: true }]}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item label="Đáp án">
          <Form.List name="answers">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} align="baseline" style={{ display: "flex", marginBottom: 8 }}>
                    <Form.Item {...restField} name={[name, "text"]} rules={[{ required: true }]} style={{ flex: 1, marginBottom: 0 }}>
                      <Input placeholder="Đáp án" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, "isCorrect"]} valuePropName="checked" style={{ marginBottom: 0 }}>
                      <Radio value={name}>Đúng</Radio>
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add({ id: `${Date.now()}`, text: "", isCorrect: false })} icon={<PlusOutlined />}>
                  Thêm đáp án
                </Button>
              </>
            )}
          </Form.List>
        </Form.Item>
        <Form.Item name="correctAnswerId" label="Đáp án đúng" rules={[{ required: true }]}>
          <Input placeholder="Nhập ID đáp án đúng" />
        </Form.Item>
        <Form.Item name="tags" label="Tags">
          <Select mode="tags" placeholder="Nhập tag" style={{ width: "100%" }} />
        </Form.Item>
        <Space>
          <Form.Item name="difficulty" label="Độ khó" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "easy", label: "Dễ" },
                { value: "medium", label: "Trung bình" },
                { value: "hard", label: "Khó" },
              ]}
            />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "draft", label: "Nháp" },
                { value: "ready", label: "Sẵn sàng" },
                { value: "archived", label: "Lưu trữ" },
              ]}
            />
          </Form.Item>
        </Space>
      </Form>
    </Modal>
  );
}
