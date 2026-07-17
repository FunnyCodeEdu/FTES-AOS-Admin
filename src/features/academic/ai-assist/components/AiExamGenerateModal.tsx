// Modal "Sinh câu hỏi bằng AI" cho quiz bank (design admin-lecturer-ai-assist §2).
//
// Luồng: chọn nguồn ngữ cảnh (bài học của 1 course | môn học + chủ đề tự do) + số câu (1..50) +
// độ khó → submit POST /ai/teacher/exam-generate (envelope 1002 → JobRef) → poll GET /ai/jobs/{id}
// → PREVIEW: map prompt→content, answer_key→correct, sửa inline + keep/drop từng câu, hiện model.
// "Thêm N câu" gọi onInsert(kept) — TRANG mẹ lưu qua action bulk-import sẵn có; modal KHÔNG tự lưu.
//
// BE guardLecturerScope cần ÍT NHẤT một tham chiếu lecturer-owned (lessonId | subjectId); topic
// đơn thuần KHÔNG đủ. Lỗi 403 = lesson/subject ngoài phạm vi giảng viên → message ownership rõ.

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { ApiError } from "../../../../shared/api/client";
import { SubjectSelect } from "../../components/SubjectSelect";
import { useCourse, useCourses } from "../../courses/api/courses.api";
import type { QuizFormValues } from "../../types";
import { submitExamGenerate } from "../api";
import { useAiJobPolling } from "../hooks/useAiJobPolling";
import type { AiDifficultyLevel, ExamGenerateRequest } from "../types";
import {
  mapExamResult,
  previewToFormValues,
  readGeneratingModel,
  toQuizDifficulty,
  type ExamGenResult,
  type PreviewQuestion,
} from "../lib/examToQuestions";

interface AiExamGenerateModalProps {
  open: boolean;
  onClose: () => void;
  /** Câu đã giữ + sửa → trang mẹ lưu bằng action sẵn có (KHÔNG auto-save trong modal). */
  onInsert: (questions: QuizFormValues[]) => void;
  /** Bật loading nút "Thêm" khi trang mẹ đang lưu. */
  inserting?: boolean;
}

type SourceMode = "lesson" | "subject";

const MAX_QUESTION_COUNT = 50;

function ownershipMessage(err: ApiError): string {
  if (err.code === 403) {
    return "Bạn không có quyền trên bài học/môn học đã chọn (chỉ giảng viên phụ trách mới sinh được đề). Chọn nguồn thuộc khoá bạn dạy.";
  }
  if (err.code === 400) {
    return err.errorCode === "AI_INPUT_INVALID"
      ? "Thiếu nguồn ngữ cảnh hợp lệ: chọn một bài học hoặc một môn học bạn phụ trách."
      : err.message;
  }
  return err.message || "Sinh đề thất bại. Vui lòng thử lại.";
}

export function AiExamGenerateModal({ open, onClose, onInsert, inserting }: AiExamGenerateModalProps) {
  const [form] = Form.useForm();
  const [mode, setMode] = useState<SourceMode>("lesson");
  const [courseId, setCourseId] = useState<string | undefined>();

  // Job lifecycle.
  const [jobId, setJobId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [difficulty, setDifficulty] = useState<AiDifficultyLevel>("MEDIUM");
  const [subjectForInsert, setSubjectForInsert] = useState<string | undefined>();

  // Preview state (đã map + cho phép sửa inline / keep-drop).
  const [preview, setPreview] = useState<PreviewQuestion[]>([]);
  const [kept, setKept] = useState<Record<string, boolean>>({});
  const [model, setModel] = useState<string | undefined>();

  const poll = useAiJobPolling<ExamGenResult>(jobId);

  const { data: courseList, isLoading: coursesLoading } = useCourses({ page: 1, pageSize: 1000 });
  const { data: courseDetail, isLoading: treeLoading } = useCourse(mode === "lesson" ? courseId : undefined);

  const lessonOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (const section of courseDetail?.tree ?? []) {
      for (const node of section.children ?? []) {
        if (node.type === "lesson" && node.id) {
          opts.push({ value: node.id, label: `${section.title} › ${node.title}` });
        }
      }
    }
    return opts;
  }, [courseDetail]);

  // Reset toàn bộ khi đóng/mở lại.
  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setMode("lesson");
    setCourseId(undefined);
    setJobId(null);
    setSubmitError(null);
    setSubmitting(false);
    setPreview([]);
    setKept({});
    setModel(undefined);
    setSubjectForInsert(undefined);
  }, [open, form]);

  // Khi job COMPLETED → map result sang preview (mặc định giữ tất cả). FAILED → surface errorCode.
  useEffect(() => {
    if (!poll.isComplete) return;
    const questions = mapExamResult(poll.result);
    setPreview(questions);
    setKept(Object.fromEntries(questions.map((q) => [q.key, true])));
    setModel(readGeneratingModel(poll.result));
  }, [poll.isComplete, poll.result]);

  const jobFailed = poll.isFailed;
  const jobErrorCode = poll.job?.errorCode;
  const isPolling = jobId != null && poll.isRunning;
  const hasPreview = poll.isComplete && preview.length > 0;

  const handleSubmit = (values: {
    mode: SourceMode;
    lessonId?: string;
    subjectId?: string;
    topic?: string;
    questionCount: number;
    difficulty: AiDifficultyLevel;
  }) => {
    setSubmitError(null);
    const body: ExamGenerateRequest = {
      questionCount: values.questionCount,
      difficulty: values.difficulty,
    };
    if (values.mode === "lesson") {
      body.lessonId = values.lessonId;
    } else {
      body.subjectId = values.subjectId;
      if (values.topic?.trim()) body.topic = values.topic.trim();
    }
    setDifficulty(values.difficulty);
    setSubjectForInsert(values.mode === "subject" ? values.subjectId : undefined);

    setSubmitting(true);
    setPreview([]);
    setKept({});
    setModel(undefined);
    setJobId(null);
    submitExamGenerate(body)
      .then((ref) => setJobId(ref.jobId))
      .catch((err) => {
        setSubmitError(err instanceof ApiError ? ownershipMessage(err) : "Sinh đề thất bại.");
      })
      .finally(() => setSubmitting(false));
  };

  const updateAnswerText = (qKey: string, answerId: string, text: string) => {
    setPreview((prev) =>
      prev.map((q) =>
        q.key === qKey
          ? { ...q, answers: q.answers.map((a) => (a.id === answerId ? { ...a, text } : a)) }
          : q
      )
    );
  };

  const updateContent = (qKey: string, content: string) => {
    setPreview((prev) => prev.map((q) => (q.key === qKey ? { ...q, content } : q)));
  };

  // Đặt đáp án đúng trong preview: SINGLE_CHOICE/TRUE_FALSE = đúng-một (radio, chọn cái này
  // bỏ các cái khác); MULTIPLE_CHOICE = bật/tắt (checkbox). Vá lỗ hổng answer_key model trả
  // không map được → câu 0 đáp án đúng, trước đây không sửa được trong modal.
  const setCorrect = (qKey: string, answerId: string) => {
    setPreview((prev) =>
      prev.map((q) => {
        if (q.key !== qKey) return q;
        if (q.type === "MULTIPLE_CHOICE") {
          return {
            ...q,
            answers: q.answers.map((a) =>
              a.id === answerId ? { ...a, isCorrect: !a.isCorrect } : a
            ),
          };
        }
        return { ...q, answers: q.answers.map((a) => ({ ...a, isCorrect: a.id === answerId })) };
      })
    );
  };

  const hasCorrect = (q: PreviewQuestion) => q.answers.some((a) => a.isCorrect);

  const keptCount = preview.filter((q) => kept[q.key]).length;
  // Câu được giữ nhưng chưa có đáp án đúng → BE bulk-import sẽ từ chối (SINGLE cần đúng 1,
  // MULTIPLE cần ≥1). Chặn "Thêm" tới khi giảng viên chọn đáp án hoặc bỏ giữ.
  const keptWithoutCorrect = preview.filter((q) => kept[q.key] && !hasCorrect(q)).length;

  const handleInsert = () => {
    const chosen = preview
      .filter((q) => kept[q.key] && hasCorrect(q))
      .map((q) => previewToFormValues(q, toQuizDifficulty(difficulty), subjectForInsert));
    if (chosen.length === 0) return;
    onInsert(chosen);
  };

  const canRegenerate = poll.isComplete || jobFailed || !!submitError;

  return (
    <Modal
      title="Sinh câu hỏi bằng AI"
      open={open}
      onCancel={onClose}
      width={860}
      footer={
        hasPreview
          ? [
              <Button key="cancel" onClick={onClose}>
                Đóng
              </Button>,
              <Button
                key="insert"
                type="primary"
                disabled={keptCount === 0 || keptWithoutCorrect > 0}
                loading={inserting}
                onClick={handleInsert}
              >
                Thêm {keptCount} câu vào ngân hàng
              </Button>,
            ]
          : [
              <Button key="cancel" onClick={onClose}>
                Đóng
              </Button>,
            ]
      }
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ mode: "lesson", questionCount: 10, difficulty: "MEDIUM" }}
        onFinish={handleSubmit}
      >
        <Form.Item name="mode" label="Nguồn ngữ cảnh">
          <Radio.Group
            onChange={(e) => {
              setMode(e.target.value);
              form.setFieldsValue({ lessonId: undefined, subjectId: undefined, topic: undefined });
            }}
          >
            <Radio value="lesson">Bài học của course</Radio>
            <Radio value="subject">Môn học + chủ đề</Radio>
          </Radio.Group>
        </Form.Item>

        {mode === "lesson" ? (
          <Space align="start" style={{ width: "100%" }} size="middle" wrap>
            <Form.Item label="Khoá học" style={{ minWidth: 260, marginBottom: 12 }}>
              <Select
                loading={coursesLoading}
                placeholder="Chọn khoá học"
                value={courseId}
                onChange={(v) => {
                  setCourseId(v);
                  form.setFieldsValue({ lessonId: undefined });
                }}
                showSearch
                optionFilterProp="label"
                style={{ minWidth: 260 }}
                options={(courseList?.items ?? []).map((c) => ({ value: c.id, label: c.name }))}
              />
            </Form.Item>
            <Form.Item
              name="lessonId"
              label="Bài học"
              rules={[{ required: true, message: "Chọn bài học" }]}
              style={{ minWidth: 320, marginBottom: 12 }}
            >
              <Select
                loading={treeLoading}
                disabled={!courseId}
                placeholder={courseId ? "Chọn bài học" : "Chọn khoá học trước"}
                showSearch
                optionFilterProp="label"
                style={{ minWidth: 320 }}
                options={lessonOptions}
                notFoundContent={courseId && !treeLoading ? "Khoá chưa có bài học" : undefined}
              />
            </Form.Item>
          </Space>
        ) : (
          <Space align="start" style={{ width: "100%" }} size="middle" wrap>
            <Form.Item
              name="subjectId"
              label="Môn học"
              rules={[{ required: true, message: "Chọn môn học bạn phụ trách" }]}
              style={{ minWidth: 260, marginBottom: 12 }}
            >
              <SubjectSelect placeholder="Chọn môn học" style={{ minWidth: 260 }} />
            </Form.Item>
            <Form.Item name="topic" label="Chủ đề (tuỳ chọn)" style={{ minWidth: 320, marginBottom: 12 }}>
              <Input placeholder="VD: Vòng lặp for trong Java" style={{ minWidth: 320 }} />
            </Form.Item>
          </Space>
        )}

        <Space size="large" wrap>
          <Form.Item
            name="questionCount"
            label="Số câu"
            rules={[{ required: true, message: "Nhập số câu" }]}
          >
            <InputNumber min={1} max={MAX_QUESTION_COUNT} style={{ width: 120 }} />
          </Form.Item>
          <Form.Item name="difficulty" label="Độ khó" rules={[{ required: true }]}>
            <Select
              style={{ minWidth: 160 }}
              options={[
                { value: "EASY", label: "Dễ" },
                { value: "MEDIUM", label: "Trung bình" },
                { value: "HARD", label: "Khó" },
              ]}
            />
          </Form.Item>
          <Form.Item label=" ">
            <Button type="primary" htmlType="submit" loading={submitting || isPolling}>
              {canRegenerate ? "Sinh lại" : "Sinh câu hỏi"}
            </Button>
          </Form.Item>
        </Space>
      </Form>

      {submitError && (
        <Alert type="error" showIcon message={submitError} style={{ marginBottom: 12 }} />
      )}

      {isPolling && (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <Spin />
          <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
            {poll.isStale ? "Vẫn đang xử lý, đề nhiều câu có thể lâu hơn…" : "AI đang sinh câu hỏi…"}
          </Typography.Paragraph>
        </div>
      )}

      {jobFailed && (
        <Alert
          type="error"
          showIcon
          message="Sinh đề thất bại"
          description={
            poll.job?.errorMessage || jobErrorCode
              ? `${poll.job?.errorMessage ?? "Job thất bại"}${jobErrorCode ? ` (mã lỗi: ${jobErrorCode})` : ""}`
              : "Job không hoàn tất. Thử lại hoặc đổi nguồn ngữ cảnh."
          }
          style={{ marginBottom: 12 }}
        />
      )}

      {poll.isComplete && preview.length === 0 && (
        <Empty description="AI không trả về câu hỏi dùng được. Thử lại hoặc đổi chủ đề/độ khó." />
      )}

      {hasPreview && (
        <>
          <Divider style={{ margin: "12px 0" }} />
          <Space style={{ marginBottom: 8, justifyContent: "space-between", width: "100%" }}>
            <Typography.Text strong>
              Xem trước ({keptCount}/{preview.length} câu được giữ)
            </Typography.Text>
            {model && <Tag color="blue">Model: {model}</Tag>}
          </Space>
          {keptWithoutCorrect > 0 && (
            <Alert
              type="warning"
              showIcon
              message={`${keptWithoutCorrect} câu chưa chọn đáp án đúng`}
              description="Chọn đáp án đúng cho các câu được tô cảnh báo (hoặc bỏ giữ) trước khi thêm vào ngân hàng."
              style={{ marginBottom: 8 }}
            />
          )}
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            {preview.map((q, i) => (
              <div
                key={q.key}
                style={{
                  border:
                    kept[q.key] && !hasCorrect(q)
                      ? "1px solid var(--ant-color-warning, #faad14)"
                      : "1px solid var(--ant-color-border, #f0f0f0)",
                  borderRadius: 8,
                  padding: 12,
                  opacity: kept[q.key] ? 1 : 0.5,
                }}
              >
                <Space align="start" style={{ width: "100%", justifyContent: "space-between" }}>
                  <Checkbox
                    checked={!!kept[q.key]}
                    onChange={(e) => setKept((prev) => ({ ...prev, [q.key]: e.target.checked }))}
                  >
                    Giữ câu {i + 1}
                  </Checkbox>
                  <Space size={4}>
                    {q.skill && <Tag>{q.skill}</Tag>}
                    {kept[q.key] && !hasCorrect(q) && (
                      <Tag color="warning">Chưa có đáp án đúng</Tag>
                    )}
                  </Space>
                </Space>
                <Input.TextArea
                  value={q.content}
                  onChange={(e) => updateContent(q.key, e.target.value)}
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  style={{ margin: "8px 0" }}
                  disabled={!kept[q.key]}
                />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {q.type === "MULTIPLE_CHOICE"
                    ? "Chọn các đáp án đúng (nhiều lựa chọn):"
                    : "Chọn đáp án đúng:"}
                </Typography.Text>
                <Space direction="vertical" style={{ width: "100%", marginTop: 4 }} size={4}>
                  {q.answers.map((a) =>
                    q.type === "MULTIPLE_CHOICE" ? (
                      <Space key={a.id} align="center" style={{ width: "100%" }}>
                        <Checkbox
                          checked={a.isCorrect}
                          disabled={!kept[q.key]}
                          onChange={() => setCorrect(q.key, a.id)}
                        />
                        <Input
                          value={a.text}
                          onChange={(e) => updateAnswerText(q.key, a.id, e.target.value)}
                          disabled={!kept[q.key]}
                          style={{ width: 620 }}
                        />
                      </Space>
                    ) : (
                      <Space key={a.id} align="center" style={{ width: "100%" }}>
                        <Radio
                          checked={a.isCorrect}
                          disabled={!kept[q.key]}
                          onChange={() => setCorrect(q.key, a.id)}
                        />
                        <Input
                          value={a.text}
                          onChange={(e) => updateAnswerText(q.key, a.id, e.target.value)}
                          disabled={!kept[q.key]}
                          style={{ width: 620 }}
                        />
                      </Space>
                    )
                  )}
                </Space>
              </div>
            ))}
          </Space>
        </>
      )}
    </Modal>
  );
}
