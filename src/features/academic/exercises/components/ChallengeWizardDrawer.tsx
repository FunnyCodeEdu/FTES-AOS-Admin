import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Radio,
  Space,
  Steps,
  Tag,
  Typography,
  message,
} from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { ApiError } from "../../../../shared/api/client";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import {
  useCreateChallenge,
  useLinkChallengeLesson,
  usePublishChallenge,
  useUpsertChallengeMcq,
  useUpsertChallengeRubrics,
  useUpsertChallengeTestCases,
} from "../api/exercises.api";
import {
  validateCorrectKeys,
  type ChallengeType,
  type ChallengeView,
} from "../types";

interface ChallengeWizardDrawerProps {
  lessonId: string;
  open: boolean;
  disabled?: boolean;
  /** Challenge active đang chiếm chỗ lesson (nếu có) — để cảnh báo trước khi gắn. */
  occupyingChallenge: ChallengeView | null;
  onClose: () => void;
}

const OPTION_KEYS = ["A", "B", "C", "D", "E", "F"];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

interface MetaForm {
  title: string;
  slug: string;
  description?: string;
  type: ChallengeType;
  range: [Dayjs, Dayjs];
  maxSubmissions: number;
}

interface McqRow {
  question: string;
  options: { text: string; correct: boolean }[];
  points?: number;
}
interface TestCaseRow {
  name: string;
  input: string;
  expectedOutput: string;
  weight?: number;
  hidden: boolean;
}
interface RubricRow {
  criterion: string;
  description?: string;
  maxScore?: number;
}
interface ContentForm {
  mcq?: McqRow[];
  testCases?: TestCaseRow[];
  rubrics?: RubricRow[];
}

export function ChallengeWizardDrawer({
  lessonId,
  open,
  disabled,
  occupyingChallenge,
  onClose,
}: ChallengeWizardDrawerProps) {
  const [metaForm] = Form.useForm<MetaForm>();
  const [contentForm] = Form.useForm<ContentForm>();
  const slugTouched = useRef(false);

  const [step, setStep] = useState(0);
  const [challenge, setChallenge] = useState<ChallengeView | null>(null);
  const [type, setType] = useState<ChallengeType>("MULTIPLE_CHOICE");
  const [linked, setLinked] = useState(false);
  const [linkConflict, setLinkConflict] = useState<string | null>(null);

  const createChallenge = useCreateChallenge();
  const upsertMcq = useUpsertChallengeMcq();
  const upsertTestCases = useUpsertChallengeTestCases();
  const upsertRubrics = useUpsertChallengeRubrics();
  const linkLesson = useLinkChallengeLesson();
  const publishChallenge = usePublishChallenge();

  useEffect(() => {
    if (!open) return;
    slugTouched.current = false;
    setStep(0);
    setChallenge(null);
    setType("MULTIPLE_CHOICE");
    setLinked(false);
    setLinkConflict(null);
    metaForm.setFieldsValue({
      title: "",
      slug: "",
      description: "",
      type: "MULTIPLE_CHOICE",
      range: [dayjs(), dayjs().add(1, "year")],
      maxSubmissions: 10,
    });
    contentForm.setFieldsValue({
      mcq: [{ question: "", options: [{ text: "", correct: false }, { text: "", correct: false }], points: 1 }],
      testCases: [{ name: "Test 1", input: "", expectedOutput: "", weight: 1, hidden: false }],
      rubrics: [{ criterion: "", description: "", maxScore: 10 }],
    });
  }, [open, metaForm, contentForm]);

  const handleMetaChange = (changed: Partial<MetaForm>) => {
    if (changed.slug !== undefined) slugTouched.current = true;
    if (changed.title !== undefined && !slugTouched.current) {
      metaForm.setFieldValue("slug", slugify(changed.title ?? ""));
    }
    if (changed.type !== undefined) setType(changed.type);
  };

  // Bước 1 → tạo challenge
  const handleCreate = (values: MetaForm) => {
    createChallenge.mutate(
      {
        title: values.title,
        slug: values.slug || slugify(values.title),
        description: values.description || undefined,
        type: values.type,
        mode: "INDIVIDUAL",
        startsAt: values.range[0].toISOString(),
        endsAt: values.range[1].toISOString(),
        maxSubmissions: values.maxSubmissions,
      },
      {
        onSuccess: (c) => {
          setChallenge(c);
          setType(values.type);
          setStep(1);
        },
        onError: handleAdminMutationError,
      }
    );
  };

  // Bước 2 → nội dung theo type
  const handleContent = (values: ContentForm) => {
    if (!challenge) return;
    if (type === "MULTIPLE_CHOICE") {
      const questions = (values.mcq ?? []).map((q, qi) => {
        const options = q.options.map((o, i) => ({ key: OPTION_KEYS[i] ?? String(i + 1), text: o.text }));
        const correctKeys = q.options
          .map((o, i) => (o.correct ? OPTION_KEYS[i] ?? String(i + 1) : null))
          .filter((k): k is string => k !== null);
        return { question: q.question, options, correctKeys, points: q.points ?? 1, orderNo: qi, _err: validateCorrectKeys("MULTIPLE_CHOICE", correctKeys) };
      });
      const bad = questions.find((q) => q._err);
      if (bad) {
        message.error(bad._err ?? "Câu MCQ chưa hợp lệ");
        return;
      }
      upsertMcq.mutate(
        { id: challenge.id, questions: questions.map(({ _err, ...q }) => q) },
        { onSuccess: () => setStep(2), onError: handleAdminMutationError }
      );
      return;
    }
    if (type === "CODE") {
      const testCases = (values.testCases ?? []).map((t, i) => ({
        name: t.name,
        input: t.input,
        expectedOutput: t.expectedOutput,
        weight: t.weight ?? 1,
        hidden: t.hidden,
        timeLimitMs: 2000,
        memoryLimitMb: 256,
        orderNo: i,
      }));
      const rubrics = (values.rubrics ?? []).map((r, i) => ({
        criterion: r.criterion,
        description: r.description ?? "",
        maxScore: r.maxScore ?? 10,
        orderNo: i,
      }));
      upsertTestCases.mutate(
        { id: challenge.id, testCases },
        {
          onSuccess: () => {
            upsertRubrics.mutate(
              { id: challenge.id, rubrics },
              { onSuccess: () => setStep(2), onError: handleAdminMutationError }
            );
          },
          onError: handleAdminMutationError,
        }
      );
      return;
    }
    // ESSAY
    const rubrics = (values.rubrics ?? []).map((r, i) => ({
      criterion: r.criterion,
      description: r.description ?? "",
      maxScore: r.maxScore ?? 10,
      orderNo: i,
    }));
    upsertRubrics.mutate(
      { id: challenge.id, rubrics },
      { onSuccess: () => setStep(2), onError: handleAdminMutationError }
    );
  };

  // Bước 3 → gắn lesson
  const handleLink = () => {
    if (!challenge) return;
    setLinkConflict(null);
    linkLesson.mutate(
      { id: challenge.id, lessonId },
      {
        onSuccess: () => {
          setLinked(true);
          message.success("Đã gắn challenge vào bài học");
        },
        onError: (err) => {
          const isConflict =
            err instanceof ApiError &&
            (err.errorCode === "CHALLENGE_LESSON_ALREADY_ATTACHED" || err.code === 409);
          if (isConflict) {
            const occ = occupyingChallenge;
            setLinkConflict(
              occ
                ? `Bài học đã có challenge active "${occ.title}" (${occ.status}). Hãy lưu trữ challenge đó trước, rồi thử gắn lại.`
                : "Bài học đã có một challenge active khác. Hãy lưu trữ nó trước khi gắn challenge mới."
            );
          } else {
            handleAdminMutationError(err);
          }
        },
      }
    );
  };

  const handlePublish = () => {
    if (!challenge) return;
    publishChallenge.mutate(
      { id: challenge.id },
      {
        onSuccess: () => {
          message.success("Đã publish challenge");
          onClose();
        },
        onError: handleAdminMutationError,
      }
    );
  };

  const aiNote =
    type === "MULTIPLE_CHOICE"
      ? null
      : "Bài loại CODE/ESSAY được chấm bởi AI (ai-service, lane AI) — cấu hình model KHÔNG đặt ở đây.";

  return (
    <Drawer
      title="Tạo challenge cho bài học"
      width={820}
      open={open}
      onClose={onClose}
      extra={challenge ? <Tag color="blue">{challenge.status}</Tag> : null}
    >
      {disabled && (
        <Alert type="warning" message="Chế độ chỉ đọc — không có quyền quản challenge." style={{ marginBottom: 16 }} />
      )}
      <Steps
        current={step}
        size="small"
        style={{ marginBottom: 24 }}
        items={[{ title: "Thông tin" }, { title: "Nội dung" }, { title: "Gắn & Publish" }]}
      />

      {/* Step 0 */}
      {step === 0 && (
        <Form
          form={metaForm}
          layout="vertical"
          onFinish={handleCreate}
          onValuesChange={handleMetaChange}
          disabled={disabled}
        >
          {occupyingChallenge && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message="Bài học này đã có challenge active"
              description={`"${occupyingChallenge.title}" (${occupyingChallenge.status}). Bạn vẫn có thể soạn challenge mới nhưng phải lưu trữ challenge cũ trước khi gắn ở bước 3.`}
            />
          )}
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: "Nhập tiêu đề" }]}>
            <Input placeholder="VD: Thử thách thuật toán tuần 1" />
          </Form.Item>
          <Form.Item name="slug" label="Slug (tự sinh từ tiêu đề, sửa được)" rules={[{ required: true, message: "Nhập slug" }]}>
            <Input placeholder="thu-thach-thuat-toan-tuan-1" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="type" label="Loại challenge" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio.Button value="MULTIPLE_CHOICE">Trắc nghiệm (MCQ)</Radio.Button>
              <Radio.Button value="CODE">Code</Radio.Button>
              <Radio.Button value="ESSAY">Tự luận (Essay)</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Space size="large" wrap>
            <Form.Item name="range" label="Thời gian mở → đóng" rules={[{ required: true }]}>
              <DatePicker.RangePicker showTime />
            </Form.Item>
            <Form.Item name="maxSubmissions" label="Số lần nộp tối đa" rules={[{ required: true }]}>
              <InputNumber min={1} />
            </Form.Item>
          </Space>
          <Button type="primary" htmlType="submit" loading={createChallenge.isPending}>
            Tạo & tiếp tục
          </Button>
        </Form>
      )}

      {/* Step 1 */}
      {step === 1 && (
        <Form form={contentForm} layout="vertical" onFinish={handleContent} disabled={disabled}>
          {aiNote && <Alert type="info" showIcon message={aiNote} style={{ marginBottom: 16 }} />}

          {type === "MULTIPLE_CHOICE" && (
            <Form.List name="mcq">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...rf }, qi) => (
                    <div key={key} style={{ border: "1px solid #f0f0f0", padding: 12, marginBottom: 12, borderRadius: 6 }}>
                      <Space style={{ marginBottom: 8 }}>
                        <Tag color="blue">Câu {qi + 1}</Tag>
                        {fields.length > 1 && <MinusCircleOutlined onClick={() => remove(name)} />}
                      </Space>
                      <Form.Item {...rf} name={[name, "question"]} label="Nội dung" rules={[{ required: true, message: "Nhập câu hỏi" }]}>
                        <Input.TextArea rows={2} />
                      </Form.Item>
                      <Form.List name={[name, "options"]}>
                        {(opts, { add: addOpt, remove: rmOpt }) => (
                          <>
                            {opts.map(({ key: ok, name: on, ...orf }, oi) => (
                              <Space key={ok} align="baseline" style={{ display: "flex", marginBottom: 6 }}>
                                <Tag>{OPTION_KEYS[oi] ?? oi + 1}</Tag>
                                <Form.Item {...orf} name={[on, "text"]} rules={[{ required: true, message: "Nhập đáp án" }]} style={{ marginBottom: 0, flex: 1 }}>
                                  <Input placeholder="Đáp án" style={{ width: 340 }} />
                                </Form.Item>
                                <Form.Item {...orf} name={[on, "correct"]} valuePropName="checked" style={{ marginBottom: 0 }}>
                                  <Checkbox>Đúng</Checkbox>
                                </Form.Item>
                                {opts.length > 2 && <MinusCircleOutlined onClick={() => rmOpt(on)} />}
                              </Space>
                            ))}
                            {opts.length < OPTION_KEYS.length && (
                              <Button type="dashed" size="small" onClick={() => addOpt({ text: "", correct: false })} icon={<PlusOutlined />}>
                                Thêm đáp án
                              </Button>
                            )}
                          </>
                        )}
                      </Form.List>
                      <Form.Item {...rf} name={[name, "points"]} label="Điểm" style={{ marginTop: 8 }}>
                        <InputNumber min={0} />
                      </Form.Item>
                    </div>
                  ))}
                  <Button type="dashed" onClick={() => add({ question: "", options: [{ text: "", correct: false }, { text: "", correct: false }], points: 1 })} icon={<PlusOutlined />}>
                    Thêm câu hỏi MCQ
                  </Button>
                </>
              )}
            </Form.List>
          )}

          {type === "CODE" && (
            <>
              <Divider orientation="left">Test cases</Divider>
              <Form.List name="testCases">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...rf }) => (
                      <Space key={key} align="baseline" style={{ display: "flex", marginBottom: 8, flexWrap: "wrap" }}>
                        <Form.Item {...rf} name={[name, "name"]} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                          <Input placeholder="Tên" style={{ width: 120 }} />
                        </Form.Item>
                        <Form.Item {...rf} name={[name, "input"]} style={{ marginBottom: 0 }}>
                          <Input placeholder="Input" style={{ width: 220 }} />
                        </Form.Item>
                        <Form.Item {...rf} name={[name, "expectedOutput"]} style={{ marginBottom: 0 }}>
                          <Input placeholder="Output mong đợi" style={{ width: 220 }} />
                        </Form.Item>
                        <Form.Item {...rf} name={[name, "weight"]} style={{ marginBottom: 0 }}>
                          <InputNumber min={0} placeholder="Trọng số" />
                        </Form.Item>
                        <Form.Item {...rf} name={[name, "hidden"]} valuePropName="checked" style={{ marginBottom: 0 }}>
                          <Checkbox>Ẩn</Checkbox>
                        </Form.Item>
                        {fields.length > 1 && <MinusCircleOutlined onClick={() => remove(name)} />}
                      </Space>
                    ))}
                    <Button type="dashed" onClick={() => add({ name: `Test ${fields.length + 1}`, input: "", expectedOutput: "", weight: 1, hidden: false })} icon={<PlusOutlined />}>
                      Thêm test case
                    </Button>
                  </>
                )}
              </Form.List>
              <Divider orientation="left">Rubrics</Divider>
              <RubricEditor />
            </>
          )}

          {type === "ESSAY" && (
            <>
              <Divider orientation="left">Rubrics (AI chấm theo tiêu chí)</Divider>
              <RubricEditor />
            </>
          )}

          <Divider />
          <Space>
            <Button onClick={() => setStep(0)} disabled>
              Quay lại
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={upsertMcq.isPending || upsertTestCases.isPending || upsertRubrics.isPending}
            >
              Lưu nội dung & tiếp tục
            </Button>
          </Space>
        </Form>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <>
          {linkConflict && (
            <Alert type="error" showIcon message="Không thể gắn vào bài học" description={linkConflict} style={{ marginBottom: 16 }} />
          )}
          {!linked && !linkConflict && occupyingChallenge && (
            <Alert
              type="warning"
              showIcon
              message="Bài học đang có challenge active"
              description={`"${occupyingChallenge.title}" — cần lưu trữ trước khi gắn challenge mới.`}
              style={{ marginBottom: 16 }}
            />
          )}
          {linked && (
            <Alert type="success" showIcon message="Đã gắn vào bài học" style={{ marginBottom: 16 }} />
          )}
          <Typography.Paragraph>
            Gắn challenge <Typography.Text strong>{challenge?.title}</Typography.Text> vào bài học hiện tại, sau đó Publish để học viên thấy.
          </Typography.Paragraph>
          <Space>
            {!linked && (
              <Button type="primary" onClick={handleLink} loading={linkLesson.isPending} disabled={disabled}>
                Gắn vào bài học
              </Button>
            )}
            <Button
              type="primary"
              onClick={handlePublish}
              loading={publishChallenge.isPending}
              disabled={disabled || !linked}
            >
              Publish
            </Button>
          </Space>
        </>
      )}
    </Drawer>
  );
}

/** Editor rubric dùng chung cho CODE và ESSAY. */
function RubricEditor() {
  return (
    <Form.List name="rubrics">
      {(fields, { add, remove }) => (
        <>
          {fields.map(({ key, name, ...rf }) => (
            <Space key={key} align="baseline" style={{ display: "flex", marginBottom: 8, flexWrap: "wrap" }}>
              <Form.Item {...rf} name={[name, "criterion"]} rules={[{ required: true, message: "Nhập tiêu chí" }]} style={{ marginBottom: 0 }}>
                <Input placeholder="Tiêu chí" style={{ width: 200 }} />
              </Form.Item>
              <Form.Item {...rf} name={[name, "description"]} style={{ marginBottom: 0 }}>
                <Input placeholder="Mô tả" style={{ width: 280 }} />
              </Form.Item>
              <Form.Item {...rf} name={[name, "maxScore"]} style={{ marginBottom: 0 }}>
                <InputNumber min={0} placeholder="Điểm tối đa" />
              </Form.Item>
              {fields.length > 1 && <MinusCircleOutlined onClick={() => remove(name)} />}
            </Space>
          ))}
          <Button type="dashed" onClick={() => add({ criterion: "", description: "", maxScore: 10 })} icon={<PlusOutlined />}>
            Thêm tiêu chí
          </Button>
        </>
      )}
    </Form.List>
  );
}
