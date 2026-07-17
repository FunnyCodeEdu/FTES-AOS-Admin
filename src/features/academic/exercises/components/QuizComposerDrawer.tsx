import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import {
  useAddQuizQuestion,
  useArchiveQuiz,
  useCreateQuiz,
  useDeleteQuizQuestion,
  usePublishQuiz,
  useUnpublishQuiz,
} from "../api/exercises.api";
import {
  validateCorrectKeys,
  type QuizQuestionType,
  type QuizSummaryView,
} from "../types";

interface QuizComposerDrawerProps {
  lessonId: string;
  quiz: QuizSummaryView | null; // null = tạo mới
  open: boolean;
  disabled?: boolean;
  onClose: () => void;
}

interface QuizMetaForm {
  title: string;
  description?: string;
  passScorePercent: number;
  timeLimitSeconds?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
}

interface OptionRow {
  text: string;
  correct: boolean;
}

interface QuestionForm {
  question: string;
  type: QuizQuestionType;
  options: OptionRow[];
  explanation?: string;
  points?: number;
}

/** Câu hỏi đã thêm trong phiên này (BE chưa có GET question-list cho manager). */
interface AddedQuestion {
  id: string;
  question: string;
  type: QuizQuestionType;
}

const OPTION_KEYS = ["A", "B", "C", "D", "E", "F"];

function statusColor(status: string): string {
  if (status === "PUBLISHED") return "green";
  if (status === "ARCHIVED") return "default";
  return "orange";
}

export function QuizComposerDrawer({
  lessonId,
  quiz,
  open,
  disabled,
  onClose,
}: QuizComposerDrawerProps) {
  const [metaForm] = Form.useForm<QuizMetaForm>();
  const [questionForm] = Form.useForm<QuestionForm>();

  // quizId hiện hành: từ quiz có sẵn, hoặc từ meta vừa tạo.
  const [createdQuizId, setCreatedQuizId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("DRAFT");
  const [added, setAdded] = useState<AddedQuestion[]>([]);

  const quizId = quiz?.id ?? createdQuizId;
  const isEditing = Boolean(quizId);

  const createQuiz = useCreateQuiz(lessonId);
  const addQuestion = useAddQuizQuestion(lessonId);
  const deleteQuestion = useDeleteQuizQuestion(lessonId);
  const publishQuiz = usePublishQuiz(lessonId);
  const unpublishQuiz = useUnpublishQuiz(lessonId);
  const archiveQuiz = useArchiveQuiz(lessonId);

  useEffect(() => {
    if (!open) return;
    setCreatedQuizId(null);
    setAdded([]);
    setStatus(quiz?.status ?? "DRAFT");
    metaForm.setFieldsValue({
      title: quiz?.title ?? "",
      description: quiz?.description ?? "",
      passScorePercent: quiz?.passScorePercent ?? 60,
      timeLimitSeconds: quiz?.timeLimitSeconds ?? undefined,
      maxAttempts: quiz?.maxAttempts ?? undefined,
      shuffleQuestions: false,
    });
    questionForm.setFieldsValue({
      question: "",
      type: "SINGLE_CHOICE",
      options: [
        { text: "", correct: false },
        { text: "", correct: false },
      ],
      explanation: "",
      points: 1,
    });
  }, [open, quiz, metaForm, questionForm]);

  const existingCount = quiz?.questionCount ?? 0;

  const handleCreateMeta = (values: QuizMetaForm) => {
    createQuiz.mutate(values, {
      onSuccess: (res) => {
        setCreatedQuizId(res.id);
        setStatus("DRAFT");
        message.success("Đã tạo quiz. Thêm câu hỏi rồi Publish.");
      },
    });
  };

  const handleAddQuestion = (values: QuestionForm) => {
    if (!quizId) return;
    const options = values.options.map((o, i) => ({
      key: OPTION_KEYS[i] ?? String(i + 1),
      text: o.text,
    }));
    const correctKeys = values.options
      .map((o, i) => (o.correct ? (OPTION_KEYS[i] ?? String(i + 1)) : null))
      .filter((k): k is string => k !== null);

    const err = validateCorrectKeys(values.type, correctKeys);
    if (err) {
      message.error(err);
      return;
    }

    addQuestion.mutate(
      {
        quizId,
        body: {
          question: values.question,
          type: values.type,
          options,
          correctKeys,
          explanation: values.explanation || undefined,
          points: values.points ?? 1,
          sortOrder: existingCount + added.length,
        },
      },
      {
        onSuccess: (res) => {
          setAdded((prev) => [
            ...prev,
            { id: res.id, question: values.question, type: values.type },
          ]);
          questionForm.setFieldsValue({
            question: "",
            type: "SINGLE_CHOICE",
            options: [
              { text: "", correct: false },
              { text: "", correct: false },
            ],
            explanation: "",
            points: 1,
          });
          message.success("Đã thêm câu hỏi");
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: "Xoá câu hỏi này?",
      content: "Không xoá được nếu quiz đã có lượt làm bài.",
      okText: "Xoá",
      okButtonProps: { danger: true },
      onOk: () =>
        new Promise<void>((resolve, reject) => {
          deleteQuestion.mutate(
            { questionId: id },
            {
              onSuccess: () => {
                setAdded((prev) => prev.filter((q) => q.id !== id));
                message.success("Đã xoá câu hỏi");
                resolve();
              },
              onError: () => reject(),
            }
          );
        }),
    });
  };

  const confirmPublish = () => {
    if (!quizId) return;
    Modal.confirm({
      title: "Publish quiz?",
      content: "Quiz sẽ hiển thị với học viên.",
      okText: "Publish",
      onOk: () =>
        new Promise<void>((resolve, reject) => {
          publishQuiz.mutate(
            { quizId },
            {
              onSuccess: () => {
                setStatus("PUBLISHED");
                message.success("Đã publish quiz");
                resolve();
              },
              onError: () => reject(),
            }
          );
        }),
    });
  };

  const confirmUnpublish = () => {
    if (!quizId) return;
    Modal.confirm({
      title: "Gỡ publish quiz?",
      content: "Học viên sẽ không còn thấy quiz này.",
      okText: "Gỡ publish",
      onOk: () =>
        new Promise<void>((resolve, reject) => {
          unpublishQuiz.mutate(
            { quizId },
            {
              onSuccess: () => {
                setStatus("DRAFT");
                message.success("Đã gỡ publish");
                resolve();
              },
              onError: () => reject(),
            }
          );
        }),
    });
  };

  const confirmArchive = () => {
    if (!quizId) return;
    Modal.confirm({
      title: "Lưu trữ quiz?",
      content: "Quiz sẽ bị ẩn khỏi bài học (soft-delete).",
      okText: "Lưu trữ",
      okButtonProps: { danger: true },
      onOk: () =>
        new Promise<void>((resolve, reject) => {
          archiveQuiz.mutate(
            { quizId },
            {
              onSuccess: () => {
                setStatus("ARCHIVED");
                message.success("Đã lưu trữ quiz");
                onClose();
                resolve();
              },
              onError: () => reject(),
            }
          );
        }),
    });
  };

  const totalQuestions = useMemo(
    () => existingCount + added.length,
    [existingCount, added.length]
  );

  return (
    <Drawer
      title={isEditing ? `Quiz: ${quiz?.title ?? metaForm.getFieldValue("title")}` : "Soạn quiz mới"}
      width={760}
      open={open}
      onClose={onClose}
      extra={<Tag color={statusColor(status)}>{status}</Tag>}
    >
      {disabled && (
        <Alert
          type="warning"
          message="Chế độ chỉ đọc — bạn không có quyền chỉnh sửa."
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Bước 1: meta (chỉ khi chưa có quizId) */}
      {!quizId && (
        <Form form={metaForm} layout="vertical" onFinish={handleCreateMeta} disabled={disabled}>
          <Form.Item name="title" label="Tiêu đề quiz" rules={[{ required: true, message: "Nhập tiêu đề" }]}>
            <Input placeholder="VD: Kiểm tra chương 1" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Space size="large" wrap>
            <Form.Item
              name="passScorePercent"
              label="Điểm đạt (%)"
              rules={[{ required: true }]}
            >
              <InputNumber min={0} max={100} />
            </Form.Item>
            <Form.Item name="timeLimitSeconds" label="Giới hạn thời gian (giây)">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="maxAttempts" label="Số lượt tối đa">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="shuffleQuestions" label="Trộn câu hỏi" valuePropName="checked">
              <Checkbox />
            </Form.Item>
          </Space>
          <div>
            <Button type="primary" htmlType="submit" loading={createQuiz.isPending}>
              Tạo quiz & thêm câu hỏi
            </Button>
          </div>
        </Form>
      )}

      {/* Bước 2: câu hỏi */}
      {quizId && (
        <>
          <Alert
            type="info"
            showIcon
            message={`Tổng số câu (ước tính): ${totalQuestions}`}
            description={
              existingCount > 0 && added.length === 0
                ? "Quiz đã có câu hỏi từ trước. Thêm câu mới sẽ nối vào cuối."
                : "Thêm từng câu hỏi. Ràng buộc đáp án đúng theo loại câu được kiểm tại đây."
            }
            style={{ marginBottom: 16 }}
          />

          {added.length > 0 && (
            <List
              size="small"
              bordered
              header={<Typography.Text strong>Câu hỏi đã thêm trong phiên này</Typography.Text>}
              dataSource={added}
              style={{ marginBottom: 16 }}
              renderItem={(q, idx) => (
                <List.Item
                  actions={
                    disabled
                      ? []
                      : [
                          <Button
                            key="del"
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => handleDelete(q.id)}
                          >
                            Xoá
                          </Button>,
                        ]
                  }
                >
                  <Space>
                    <Tag>{idx + 1}</Tag>
                    <Typography.Text>{q.question}</Typography.Text>
                    <Tag color="blue">{q.type}</Tag>
                  </Space>
                </List.Item>
              )}
            />
          )}

          <Divider orientation="left">Thêm câu hỏi</Divider>
          <Form
            form={questionForm}
            layout="vertical"
            onFinish={handleAddQuestion}
            disabled={disabled}
          >
            <Form.Item name="question" label="Nội dung câu hỏi" rules={[{ required: true, message: "Nhập câu hỏi" }]}>
              <Input.TextArea rows={2} />
            </Form.Item>
            <Space size="large" wrap>
              <Form.Item name="type" label="Loại câu" rules={[{ required: true }]}>
                <Select
                  style={{ minWidth: 200 }}
                  options={[
                    { value: "SINGLE_CHOICE", label: "Một đáp án đúng" },
                    { value: "MULTIPLE_CHOICE", label: "Nhiều đáp án đúng" },
                    { value: "TRUE_FALSE", label: "Đúng / Sai" },
                  ]}
                />
              </Form.Item>
              <Form.Item name="points" label="Điểm">
                <InputNumber min={0} />
              </Form.Item>
            </Space>
            <Form.Item label="Đáp án (tick ô Đúng cho đáp án đúng)">
              <Form.List name="options">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }, index) => (
                      <Space key={key} align="baseline" style={{ display: "flex", marginBottom: 8 }}>
                        <Tag>{OPTION_KEYS[index] ?? index + 1}</Tag>
                        <Form.Item
                          {...restField}
                          name={[name, "text"]}
                          rules={[{ required: true, message: "Nhập đáp án" }]}
                          style={{ flex: 1, marginBottom: 0 }}
                        >
                          <Input placeholder="Nội dung đáp án" style={{ width: 380 }} />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, "correct"]}
                          valuePropName="checked"
                          style={{ marginBottom: 0 }}
                        >
                          <Checkbox>Đúng</Checkbox>
                        </Form.Item>
                        {fields.length > 2 && (
                          <MinusCircleOutlined onClick={() => remove(name)} />
                        )}
                      </Space>
                    ))}
                    {fields.length < OPTION_KEYS.length && (
                      <Button
                        type="dashed"
                        onClick={() => add({ text: "", correct: false })}
                        icon={<PlusOutlined />}
                      >
                        Thêm đáp án
                      </Button>
                    )}
                  </>
                )}
              </Form.List>
            </Form.Item>
            <Form.Item name="explanation" label="Giải thích (tuỳ chọn)">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={addQuestion.isPending}>
              Thêm câu hỏi
            </Button>
          </Form>

          <Divider />
          <Space wrap>
            {status !== "PUBLISHED" && (
              <Button type="primary" onClick={confirmPublish} disabled={disabled}>
                Publish
              </Button>
            )}
            {status === "PUBLISHED" && (
              <Button onClick={confirmUnpublish} disabled={disabled}>
                Gỡ publish
              </Button>
            )}
            <Button danger onClick={confirmArchive} disabled={disabled}>
              Lưu trữ
            </Button>
          </Space>
        </>
      )}
    </Drawer>
  );
}
