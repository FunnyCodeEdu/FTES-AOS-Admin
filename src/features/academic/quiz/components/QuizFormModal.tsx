import { useEffect } from "react";
import { Button, Checkbox, Input, Modal, Form, Select, Space } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { SubjectSelect } from "../../components/SubjectSelect";
import type { QuizFormValues, QuizQuestion, QuizQuestionType } from "../../types";

interface QuizFormModalProps {
  open: boolean;
  question?: QuizQuestion | null;
  onClose: () => void;
  onSubmit: (values: QuizFormValues) => void;
  isSubmitting?: boolean;
}

/** View GET không trả type — suy từ số đáp án đúng (TRUE_FALSE không phân biệt được với SINGLE). */
function inferType(question: QuizQuestion): QuizQuestionType {
  const correctCount = question.answers.filter((a) => a.isCorrect).length;
  return correctCount > 1 ? "MULTIPLE_CHOICE" : "SINGLE_CHOICE";
}

export function QuizFormModal({ open, question, onClose, onSubmit, isSubmitting }: QuizFormModalProps) {
  const [form] = Form.useForm<QuizFormValues>();
  const isEdit = Boolean(question);

  useEffect(() => {
    if (open) {
      form.setFieldsValue(
        question
          ? {
              subjectId: question.subjectId || undefined,
              content: question.content,
              type: inferType(question),
              answers: question.answers,
              tags: question.tags,
              difficulty: question.difficulty,
              status: question.status,
            }
          : {
              subjectId: undefined,
              content: "",
              type: "SINGLE_CHOICE",
              answers: [
                { id: "1", text: "", isCorrect: false },
                { id: "2", text: "", isCorrect: false },
              ],
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
        <Form.Item name="subjectId" label="Môn học">
          <SubjectSelect placeholder="Chọn môn học (bỏ trống = chưa gắn môn)" />
        </Form.Item>
        <Form.Item name="content" label="Nội dung câu hỏi" rules={[{ required: true }]}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="type" label="Loại câu hỏi" rules={[{ required: true }]}>
          <Select
            options={[
              { value: "SINGLE_CHOICE", label: "Một đáp án đúng" },
              { value: "MULTIPLE_CHOICE", label: "Nhiều đáp án đúng" },
              { value: "TRUE_FALSE", label: "Đúng/Sai (đúng 2 đáp án)" },
            ]}
          />
        </Form.Item>
        <Form.Item label="Đáp án (tick ô Đúng cho đáp án đúng)">
          <Form.List name="answers">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} align="baseline" style={{ display: "flex", marginBottom: 8 }}>
                    <Form.Item {...restField} name={[name, "text"]} rules={[{ required: true }]} style={{ flex: 1, marginBottom: 0 }}>
                      <Input placeholder="Đáp án" style={{ width: 400 }} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, "isCorrect"]} valuePropName="checked" style={{ marginBottom: 0 }}>
                      <Checkbox>Đúng</Checkbox>
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
        <Form.Item name="tags" label="Tags">
          <Select mode="tags" placeholder="Nhập tag" style={{ width: "100%" }} />
        </Form.Item>
        <Space>
          <Form.Item name="difficulty" label="Độ khó" rules={[{ required: true }]}>
            <Select
              style={{ minWidth: 140 }}
              options={[
                { value: "easy", label: "Dễ" },
                { value: "medium", label: "Trung bình" },
                { value: "hard", label: "Khó" },
              ]}
            />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
            <Select
              style={{ minWidth: 140 }}
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
