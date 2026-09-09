import { useEffect, useMemo, useState } from "react";
import {
  Alert, Button, Checkbox, Input, InputNumber, Modal, Radio, Select, Space, Tag, Typography, message,
} from "antd";
import { RobotOutlined } from "@ant-design/icons";
import {
  submitChallengeDraft,
  submitChallengeFromLesson,
  type ChallengeDraft,
  type ChallengeGenResult,
} from "../api";
import { useAiJobPolling } from "../hooks/useAiJobPolling";
import {
  createChallengesBatch,
  type BatchChallengeItem,
} from "../../challenge-bank/api/challengeBank.api";
import { usePublishChallenge } from "../../exercises/api/exercises.api";
import type { SubmissionMethod } from "../../exercises/types";

/**
 * 8 giá trị ChallengeType phía BE, nhưng hiển thị theo CÁCH HỌC VIÊN LÀM BÀI thay vì enum nội bộ.
 * CODE và CODING nhìn gần như nhau nếu chỉ hiện chữ thô, trong khi bề mặt học viên khác hẳn:
 * CODE project nhận GitHub/tệp và AI chấm; CODING chạy ngay trong sandbox với test case.
 */
export const CHALLENGE_TYPE_OPTIONS = [
  {
    value: "CODE",
    label: "Project code — nộp GitHub / tệp ZIP, AI chấm",
    description: "Phù hợp PRN/PRO/HSF: học viên nộp cả project hoặc repository để FrosTES đọc source và chấm.",
  },
  {
    value: "CODING",
    label: "Code Sandbox — viết code trực tiếp, chấm test case",
    description: "Phù hợp bài thuật toán/input-output; học viên có editor, nút chạy code và bộ test.",
  },
  {
    value: "SQL",
    label: "SQL Sandbox — chạy truy vấn, chấm test case",
    description: "Học viên viết và chạy SQL trực tiếp trong sandbox.",
  },
  { value: "MULTIPLE_CHOICE", label: "Trắc nghiệm", description: "Chọn đáp án, hệ thống tự chấm." },
  { value: "ESSAY", label: "Tự luận", description: "Học viên viết câu trả lời, chấm theo rubric." },
  { value: "UIUX", label: "UI/UX", description: "Bài thiết kế, chấm theo rubric." },
  { value: "AI", label: "AI", description: "Bài thực hành AI, chấm theo rubric." },
  { value: "BUSINESS", label: "Business", description: "Bài tình huống kinh doanh, chấm theo rubric." },
] as const;

export type CodeDraftMode = "SANDBOX" | "PROJECT";

export interface CodeDraftSettings {
  mode: CodeDraftMode;
  submissionMethod: SubmissionMethod;
  /** Whitelist tệp; `.zip` là đường nộp một thư mục project sau khi nén. */
  fileExtension: string;
}

export interface AiBatchBuildOptions {
  lessonId?: string;
  courseId?: string;
  codeSettings?: Record<number, CodeDraftSettings>;
}

/** CODE/CODING đều có thể đổi giữa editor sandbox và project trong màn duyệt bản nháp. */
export function isConfigurableCodeDraft(draft: Pick<ChallengeDraft, "type">): boolean {
  return draft.type === "CODE" || draft.type === "CODING";
}

/**
 * Mặc định bám đúng nhãn ở dropdown: CODE = project; CODING = sandbox. Mentor vẫn đổi được TỪNG
 * bài sau khi AI trả kết quả, trước khi dữ liệu thật được tạo.
 */
export function defaultCodeDraftSettings(
  draft: Pick<ChallengeDraft, "type">
): CodeDraftSettings {
  return {
    mode: draft.type === "CODE" ? "PROJECT" : "SANDBOX",
    submissionMethod: "BOTH",
    fileExtension: ".zip",
  };
}

const allowsFile = (method: SubmissionMethod): boolean => method === "FILE" || method === "BOTH";

/** Chuỗi không rỗng từ config AI, hoặc fallback. */
function gradingText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

/**
 * Chuyển một draft CODE/CODING sang PROJECT:
 * - ép type CODE + submissionMethod để learner hiện ô GitHub/tệp;
 * - ép mode AI, khai question/criteria rõ ràng để publish không phụ thuộc fallback ngầm;
 * - bỏ test case vì project/repository không có stdin/stdout và phải do AI đọc toàn source.
 */
function projectGradingConfig(
  draft: ChallengeDraft,
  settings: CodeDraftSettings
): Record<string, unknown> {
  const source = draft.grading_config ?? {};
  const statement = [draft.title.trim(), draft.description.trim()].filter(Boolean).join("\n\n");
  const criteriaFallback =
    draft.description.trim() ||
    "Chấm mức độ đáp ứng yêu cầu, tính đúng đắn, cấu trúc mã nguồn và xử lý trường hợp biên.";
  const config: Record<string, unknown> = {
    ...source,
    mode: "AI",
    question: gradingText(source.question, statement || draft.title),
    criteria: gradingText(source.criteria, criteriaFallback),
  };
  // `pass_ratio` thuộc cơ chế test-case. Giữ nó trên một project AI khiến payload tự mâu thuẫn
  // (vừa AI grading vừa ngưỡng pass của sandbox) và dễ làm các consumer cũ chọn sai renderer.
  delete config.pass_ratio;
  if (allowsFile(settings.submissionMethod)) {
    config.fileExtension = settings.fileExtension.trim();
  } else {
    delete config.fileExtension;
  }
  return config;
}

/**
 * Pure builder cho POST /challenges/batch. Export để khoá regression bằng unit test: project AI
 * không được mang test case/submission shape của sandbox, còn sandbox không được vô tình có
 * submissionMethod.
 */
export function buildAiBatchChallengeItems(
  drafts: ChallengeDraft[],
  picked: ReadonlySet<number>,
  options: AiBatchBuildOptions = {}
): BatchChallengeItem[] {
  return drafts.flatMap((draft, index) => {
    if (!picked.has(index)) return [];

    const configurable = isConfigurableCodeDraft(draft);
    const settings = configurable
      ? options.codeSettings?.[index] ?? defaultCodeDraftSettings(draft)
      : undefined;
    const project = Boolean(configurable && settings?.mode === "PROJECT");
    const gradingConfig = project && settings
      ? projectGradingConfig(draft, settings)
      : draft.grading_config ?? undefined;

    return [{
      // lessonId đi RIÊNG: CreateChallengeRequest không có field này; batch item mới có.
      lessonId: options.lessonId,
      challenge: {
        title: draft.title,
        description: draft.description,
        // Hai route canonical: Project = CODE + submissionMethod; CODE/CODING chọn Sandbox đều
        // normalize thành CODING. Nhờ vậy backend không chạy validation AI của CODE trước khi batch
        // kịp insert test case, và learner luôn nhận đúng editor sandbox.
        type: project ? "CODE" : configurable ? "CODING" : draft.type,
        courseId: options.courseId,
        gradingConfig: gradingConfig ? JSON.stringify(gradingConfig) : undefined,
        tags: draft.tags ?? undefined,
        ...(project && settings ? { submissionMethod: settings.submissionMethod } : {}),
      },
      // Project GitHub/tệp do AI đọc toàn source; test case stdin/stdout chỉ thuộc sandbox.
      testCases: project
        ? null
        : draft.test_cases?.map((tc, caseIndex) => ({
            name: `Case ${caseIndex + 1}`,
            input: tc.input,
            expectedOutput: tc.expected,
            weight: tc.weight ?? 1,
            hidden: tc.hidden ?? false,
            timeLimitMs: 2000,
            memoryLimitMb: 256,
            orderNo: caseIndex,
          })) ?? null,
      mcq: draft.mcq?.map((question, questionIndex) => ({
        question: question.question,
        options: question.options,
        correctKeys: question.correct_keys,
        points: question.points ?? 1,
        orderNo: questionIndex,
      })) ?? null,
      rubrics: draft.rubric?.map((rubric, rubricIndex) => ({
        criterion: rubric.criterion,
        description: rubric.description ?? "",
        maxScore: rubric.max_score,
        orderNo: rubricIndex,
      })) ?? null,
    }];
  });
}

/** Chặn project cho nộp tệp nhưng whitelist rỗng trước khi gọi batch API. */
export function validateCodeDraftSettings(
  drafts: ChallengeDraft[],
  picked: ReadonlySet<number>,
  codeSettings: Record<number, CodeDraftSettings>
): string | null {
  for (let index = 0; index < drafts.length; index += 1) {
    const draft = drafts[index];
    if (!picked.has(index) || !isConfigurableCodeDraft(draft)) continue;
    const settings = codeSettings[index] ?? defaultCodeDraftSettings(draft);
    if (settings.mode === "SANDBOX" && !draft.test_cases?.length) {
      return `Bài “${draft.title}” chọn Code Sandbox nhưng chưa có test case.`;
    }
    if (
      settings.mode === "PROJECT" &&
      allowsFile(settings.submissionMethod) &&
      !settings.fileExtension.trim()
    ) {
      return `Bài “${draft.title}” cho nộp tệp nhưng chưa khai đuôi file (ví dụ .zip).`;
    }
  }
  return null;
}

/** Dưới ngưỡng này thì AI tự nhận là không chắc — cảnh báo giảng viên rà kỹ trước khi tạo. */
const LOW_CONFIDENCE = 0.6;

interface ChallengeGenerateModalProps {
  open: boolean;
  onClose: () => void;
  /** Có lessonId thì mở sẵn chế độ "sinh từ bài học"; không có thì chỉ còn đường dán đề. */
  lessonId?: string;
  courseId?: string;
  /** Gọi sau khi tạo xong để màn cha tải lại danh sách. */
  onCreated?: (count: number) => void;
}

/**
 * Sinh challenge bằng AI — một màn cho CẢ HAI đường:
 *
 * - **Dán đề**: giảng viên ném nguyên đoạn đề vào, AI tự phân tích và điền. Có vì màn tạo tay hiện
 *   quá nhiều bước: 391 challenge trên prod dồn vào hai loại dễ nhập nhất (ESSAY 211, CODE 171),
 *   bốn loại còn lại cộng lại được 9 bài.
 * - **Sinh từ bài học**: chọn loại + số lượng, AI đọc nội dung bài rồi trả một danh sách để tick.
 *
 * Hai đường dùng chung một shape bản nháp nên chung luôn màn xem trước này. AI KHÔNG ghi thẳng vào
 * DB: nó trả bản nháp, giảng viên tick rồi mới tạo thật.
 */
export function ChallengeGenerateModal({
  open, onClose, lessonId, courseId, onCreated,
}: ChallengeGenerateModalProps) {
  const [mode, setMode] = useState<"prompt" | "lesson">(lessonId ? "lesson" : "prompt");

  // Modal luôn được mount (chỉ đổi prop `open`) nên state khởi tạo CHỈ chạy một lần. Ở tab Kho
  // challenge, bài đích chọn ở cột trái sau khi component đã mount — không đồng bộ lại thì mở modal
  // ra vẫn kẹt ở "dán đề" dù đã chọn bài, và ngược lại bỏ chọn bài thì kẹt ở chế độ không dùng được.
  useEffect(() => {
    setMode(lessonId ? "lesson" : "prompt");
  }, [lessonId]);
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState<string | undefined>(undefined);
  const [count, setCount] = useState(5);
  const [jobId, setJobId] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  /** Cấu hình RIÊNG từng draft CODE/CODING — mentor chỉnh sau khi AI sinh, trước khi tạo thật. */
  const [codeSettings, setCodeSettings] = useState<Record<number, CodeDraftSettings>>({});
  const [creating, setCreating] = useState(false);
  const publish = usePublishChallenge();

  const poll = useAiJobPolling<ChallengeGenResult>(jobId);
  const drafts = useMemo<ChallengeDraft[]>(
    () => (poll.isComplete ? (poll.result?.drafts ?? []) : []),
    [poll.isComplete, poll.result],
  );

  // Mỗi lần có kết quả mới thì chọn sẵn tất cả — giảng viên thường lấy hết rồi bỏ vài cái, bỏ
  // nhanh hơn tick từng cái.
  useEffect(() => {
    setPicked(new Set(drafts.map((_, i) => i)));
    setCodeSettings(
      Object.fromEntries(
        drafts.flatMap((draft, index) =>
          isConfigurableCodeDraft(draft)
            ? [[index, defaultCodeDraftSettings(draft)] as const]
            : []
        )
      )
    );
  }, [drafts]);

  const reset = () => {
    setJobId(null);
    setPicked(new Set());
    setCodeSettings({});
    setPrompt("");
  };

  const submit = () => {
    setJobId(null);
    const useLesson = mode === "lesson" && !!lessonId;
    const request = useLesson
      ? submitChallengeFromLesson({ lessonId: lessonId as string, type, count, language: "vi" })
      : submitChallengeDraft({ prompt, type, language: "vi" });
    request
      .then((ref) => setJobId(ref.jobId))
      .catch((err: Error) => message.error(err.message || "Không gửi được yêu cầu"));
  };

  /**
   * `publishAfter` = tạo xong publish luôn. Trước đây chỉ có đường tạo: challenge sinh ra nằm DRAFT
   * và giảng viên phải thoát modal, tìm lại từng dòng trong tab Kho rồi bấm Publish — sinh 5 bài là
   * 5 lượt đi tìm.
   */
  const create = (publishAfter = false) => {
    const validationError = validateCodeDraftSettings(drafts, picked, codeSettings);
    if (validationError) {
      message.warning(validationError);
      return;
    }
    const items = buildAiBatchChallengeItems(drafts, picked, {
      lessonId,
      courseId,
      codeSettings,
    });
    if (items.length === 0) {
      message.warning("Chưa chọn bản nháp nào");
      return;
    }
    setCreating(true);
    createChallengesBatch(items)
      .then(async (created) => {
        if (!publishAfter) {
          message.success(`Đã tạo ${created.length} challenge`);
        } else {
          // Không có endpoint publish hàng loạt → bắn từng cái. `allSettled` chứ không phải `all`:
          // `ChallengeService.publish` chạy `validator.validate` nên một bài thiếu dữ kiện sẽ ném
          // CHALLENGE_INVALID_STATE, và `all` sẽ nuốt mất thông tin các bài đã publish xong.
          const results = await Promise.allSettled(
            created.map((c) => publish.mutateAsync({ id: c.id })),
          );
          const ok = results.filter((r) => r.status === "fulfilled").length;
          if (ok === created.length) {
            message.success(`Đã tạo và publish ${ok} challenge`);
          } else {
            // Bài lỗi VẪN tồn tại ở trạng thái DRAFT — nói rõ để giảng viên vào Kho publish tay,
            // đừng để họ tưởng là mất bài rồi sinh lại lần nữa.
            message.warning(
              `Đã tạo ${created.length} challenge, publish được ${ok}. ` +
                `${created.length - ok} bài còn ở nháp — publish tay trong tab Kho.`,
            );
          }
        }
        onCreated?.(created.length);
        reset();
        onClose();
      })
      .catch((err: Error) => message.error(err.message || "Tạo thất bại"))
      .finally(() => setCreating(false));
  };

  const toggle = (index: number) => {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const updateCodeSettings = (index: number, patch: Partial<CodeDraftSettings>) => {
    setCodeSettings((current) => ({
      ...current,
      [index]: {
        ...(current[index] ?? defaultCodeDraftSettings(drafts[index])),
        ...patch,
      },
    }));
  };

  const selectedType = CHALLENGE_TYPE_OPTIONS.find((option) => option.value === type);

  return (
    <Modal
      open={open}
      onCancel={() => { reset(); onClose(); }}
      title={<Space><RobotOutlined />Sinh challenge bằng AI</Space>}
      width={860}
      footer={
        drafts.length > 0
          ? [
              <Button key="again" onClick={submit} disabled={poll.isRunning || creating}>
                Sinh lại
              </Button>,
              <Button key="create" loading={creating} onClick={() => create(false)}>
                Tạo {picked.size} challenge
              </Button>,
              <Button
                key="create-publish"
                type="primary"
                loading={creating || publish.isPending}
                onClick={() => create(true)}
              >
                Tạo & Publish {picked.size} challenge
              </Button>,
            ]
          : [
              <Button key="cancel" onClick={() => { reset(); onClose(); }}>Đóng</Button>,
              <Button
                key="go"
                type="primary"
                loading={poll.isRunning}
                disabled={mode === "prompt" && prompt.trim().length === 0}
                onClick={submit}
              >
                Sinh bản nháp
              </Button>,
            ]
      }
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {lessonId ? (
          <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)} buttonStyle="solid">
            <Radio.Button value="lesson">Sinh từ bài học này</Radio.Button>
            <Radio.Button value="prompt">Dán đề có sẵn</Radio.Button>
          </Radio.Group>
        ) : null}

        <Space wrap align="start">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ minWidth: 430 }}
            placeholder="Chọn cách học viên làm bài (để trống = AI tự đoán)"
            value={type}
            onChange={setType}
            options={CHALLENGE_TYPE_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
          />
          {mode === "lesson" ? (
            <Space>
              <span>Số lượng</span>
              <InputNumber min={1} max={10} value={count} onChange={(v) => setCount(v ?? 5)} />
            </Space>
          ) : null}
        </Space>

        {selectedType ? (
          <Alert
            type={selectedType.value === "CODE" ? "info" : "success"}
            showIcon
            message={selectedType.label}
            description={
              selectedType.value === "CODE"
                ? `${selectedType.description} Sau khi AI sinh, bạn vẫn đổi riêng từng bài sang Code Sandbox hoặc đổi GitHub/Tệp/Cả hai.`
                : selectedType.description
            }
          />
        ) : (
          <Typography.Text type="secondary">
            AI sẽ tự đoán loại. Nếu kết quả là CODE/CODING, từng bản nháp vẫn có nút chọn rõ
            <strong> Code Sandbox</strong> hoặc <strong>Project GitHub/tệp ZIP</strong> trước khi tạo.
          </Typography.Text>
        )}

        {mode === "prompt" ? (
          <Input.TextArea
            rows={8}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={"Dán nguyên đề vào đây. Ví dụ:\n\nBài 1 - Sửa endpoint\nThiết kế lại:\nGET  /api/getStudents\nPOST /api/addStudent\n..."}
          />
        ) : null}

        {poll.isFailed ? (
          <Alert
            type="error"
            showIcon
            message="AI không sinh được bản nháp"
            description={poll.job?.errorCode ?? "Thử lại, hoặc mô tả đề rõ hơn."}
          />
        ) : null}

        {drafts.length > 0 ? (
          <Space direction="vertical" size="small" style={{ width: "100%" }}>
            <Typography.Text type="secondary">
              Tick những bài muốn giữ rồi bấm Tạo. Bản nháp chưa được lưu vào hệ thống.
            </Typography.Text>
            {drafts.map((d, i) => (
              <div
                key={`${d.title}-${i}`}
                style={{ border: "1px solid #eee", borderRadius: 8, padding: "10px 12px" }}
              >
                <Checkbox checked={picked.has(i)} onChange={() => toggle(i)}>
                  <Space wrap>
                    <Typography.Text strong>{d.title}</Typography.Text>
                    <Tag>{d.type}</Tag>
                    {d.difficulty ? <Tag color="blue">{d.difficulty}</Tag> : null}
                    {typeof d.confidence === "number" && d.confidence < LOW_CONFIDENCE ? (
                      <Tag color="warning">AI không chắc — nên rà kỹ</Tag>
                    ) : null}
                  </Space>
                </Checkbox>
                <Typography.Paragraph
                  type="secondary"
                  ellipsis={{ rows: 3, expandable: true, symbol: "xem thêm" }}
                  style={{ marginBottom: 0, marginTop: 6 }}
                >
                  {d.description}
                </Typography.Paragraph>

                {isConfigurableCodeDraft(d) && picked.has(i) ? (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 8,
                      background: "rgba(22, 119, 255, 0.06)",
                    }}
                  >
                    <Typography.Text strong>Cách học viên làm / nộp riêng bài này</Typography.Text>
                    <Radio.Group
                      value={(codeSettings[i] ?? defaultCodeDraftSettings(d)).mode}
                      onChange={(event) => updateCodeSettings(i, { mode: event.target.value })}
                      style={{ display: "block", marginTop: 8 }}
                    >
                      <Space direction="vertical" size={6}>
                        <Radio value="SANDBOX">
                          <strong>Code trực tiếp — Sandbox + test case</strong>
                          <Typography.Text type="secondary">
                            {" "}· có editor và nút chạy code; không hiện ô GitHub/tệp
                          </Typography.Text>
                        </Radio>
                        <Radio value="PROJECT">
                          <strong>Project — GitHub / tệp ZIP, AI chấm</strong>
                          <Typography.Text type="secondary">
                            {" "}· AI đọc toàn bộ source; test case của bản nháp không được lưu
                          </Typography.Text>
                        </Radio>
                      </Space>
                    </Radio.Group>

                    {(codeSettings[i] ?? defaultCodeDraftSettings(d)).mode === "PROJECT" ? (
                      <Space direction="vertical" size={8} style={{ width: "100%", marginTop: 12 }}>
                        <Typography.Text strong>Cách nộp project</Typography.Text>
                        <Radio.Group
                          value={(codeSettings[i] ?? defaultCodeDraftSettings(d)).submissionMethod}
                          onChange={(event) =>
                            updateCodeSettings(i, { submissionMethod: event.target.value })
                          }
                        >
                          <Radio.Button value="GITHUB">Chỉ link GitHub</Radio.Button>
                          <Radio.Button value="FILE">Chỉ tệp / thư mục nén</Radio.Button>
                          <Radio.Button value="BOTH">GitHub hoặc tệp</Radio.Button>
                        </Radio.Group>
                        {allowsFile(
                          (codeSettings[i] ?? defaultCodeDraftSettings(d)).submissionMethod
                        ) ? (
                          <Space wrap>
                            <Typography.Text>Đuôi tệp nhận</Typography.Text>
                            <Input
                              value={(codeSettings[i] ?? defaultCodeDraftSettings(d)).fileExtension}
                              onChange={(event) =>
                                updateCodeSettings(i, { fileExtension: event.target.value })
                              }
                              placeholder=".zip,.cs,.sln"
                              style={{ width: 220 }}
                            />
                            <Typography.Text type="secondary">
                              Thư mục cần nén thành .zip trước khi nộp.
                            </Typography.Text>
                          </Space>
                        ) : null}
                      </Space>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </Space>
        ) : null}
      </Space>
    </Modal>
  );
}
