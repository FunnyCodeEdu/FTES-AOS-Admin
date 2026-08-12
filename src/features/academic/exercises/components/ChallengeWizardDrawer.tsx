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
  Select,
  Space,
  Steps,
  Switch,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import { MinusCircleOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons";
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
  type ChallengeMcqQuestionItem,
  type ChallengeRubricItem,
  type ChallengeType,
  type ChallengeView,
  type CreateChallengeRequest,
  type SubmissionMethod,
} from "../types";
import {
  buildTestCaseItems,
  emptyTestCaseRow,
  TestCaseEditor,
  type TestCaseRow,
} from "./TestCaseEditor";

/** Nhóm lesson theo section cho picker gắn-bài ở chế độ Kho (antd Select grouped). */
export interface WizardLessonGroup {
  label: string; // tên section
  options: { label: string; value: string }[]; // lesson trong section
}

interface ChallengeWizardDrawerProps {
  /**
   * Lesson đích cố định (mode "từ bài học"). Khi bỏ trống ⇒ mode "từ Kho": bước 3 hiện
   * picker chọn lesson trong course hiện tại và cho phép bỏ qua (challenge nằm kho, chưa gắn).
   */
  lessonId?: string;
  /**
   * Additive (change admin-course-challenge-bank): mode Kho truyền courseId ⇒ create post
   * courseId để challenge thuộc kho ngay. Không truyền ⇒ hành vi cũ (tab Bài tập lesson).
   */
  courseId?: string;
  /** Nhóm lesson của course hiện tại cho picker gắn-bài (chỉ dùng ở mode Kho). */
  lessonOptions?: WizardLessonGroup[];
  open: boolean;
  disabled?: boolean;
  /** Challenge active đang chiếm chỗ lesson (nếu có) — để cảnh báo trước khi gắn. */
  occupyingChallenge?: ChallengeView | null;
  onClose: () => void;
  /** Gọi sau mỗi mutation thành công (create/link/publish) để caller invalidate kho. */
  onMutated?: () => void;
}

const OPTION_KEYS = ["A", "B", "C", "D", "E", "F"];

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

/**
 * admin-challenge-unified-form §④: Challenge CODE chọn 1 trong 2 kiểu nhập bài làm:
 * - TESTCASE: test case inline (chấm tự động) — luồng cũ (bước Nội dung soạn test case + rubric).
 * - SUBMISSION: bài NỘP (GitHub/File) → AI chấm theo rubric — gấp từ Assignment cũ. Cấu hình nộp +
 *   rubric gói vào submissionMethod + gradingConfig của payload TẠO (không có bước Nội dung riêng).
 */
export type CodeInputStyle = "TESTCASE" | "SUBMISSION";

export interface MetaForm {
  title: string;
  slug: string;
  description?: string;
  type: ChallengeType;
  /**
   * challenge-testcase-editor §4: `[mở, đóng]` — vế ĐÓNG được phép `null` (RangePicker
   * `allowEmpty={[false, true]}`) nghĩa là challenge mở VÔ HẠN. Trước đây type ép `[Dayjs, Dayjs]`
   * + `rules={[{required:true}]}` nên không có cách nào không đặt hạn đóng.
   */
  range: [Dayjs, Dayjs | null];
  maxSubmissions: number;
  /** challenge-free-flag: cho làm miễn phí (học thử) — bind Switch bước 1. */
  free: boolean;
  // ── CODE bài NỘP (folded assignment) — chỉ dùng khi type=CODE + codeInputStyle=SUBMISSION ──
  codeInputStyle?: CodeInputStyle;
  submissionMethod?: SubmissionMethod;
  fileExtension?: string;
  question?: string;
  expectedOutput?: string;
  criteria?: string;
  checkLogic?: boolean;
  checkPerform?: boolean;
  checkEdgeCase?: boolean;
  /**
   * code-sandbox-assignment §2C: nội dung file .sql seed (đọc client-side bằng FileReader). Chỉ dùng
   * khi bài NỘP + whitelist đuôi file chứa .sql — dataset sẽ chạy tạo dữ liệu trước mỗi lần học viên
   * chạy query (seed tươi mỗi lần). Gói vào gradingConfig.seedSql lúc tạo.
   */
  seedSql?: string;
  /**
   * algo-testcase-starter §3: sườn code per-ngôn-ngữ cho bài CODE (thuật toán) dạng test-case. Rows
   * {language, code} — sẽ gom thành map {ngôn ngữ→code} và gói vào gradingConfig.starterCode lúc tạo.
   * Learner-safe (sườn để học viên bắt đầu: import + khai báo hàm + khung đọc I/O, KHÔNG phải đáp án).
   */
  starterCode?: StarterCodeRow[];
  /**
   * challenge-testcase-sample-ui §3: số lần AI nhận xét (1..5) — CHỈ dùng cho bài CODE chấm bằng
   * test case. Gửi flat trên payload TẠO; BE merge vào grading_config.
   */
  aiFeedbackLimit?: number;
}

/** Một hàng sườn code (algo-testcase-starter §3): ngôn ngữ + nội dung skeleton. */
export interface StarterCodeRow {
  language?: string;
  code?: string;
}

/** Tuỳ chọn ngôn ngữ cho editor sườn code (khớp executor Piston lane AI). */
export const STARTER_CODE_LANGUAGES: { label: string; value: string }[] = [
  { label: "Python", value: "python" },
  { label: "Java", value: "java" },
  { label: "C++", value: "cpp" },
  { label: "JavaScript", value: "javascript" },
  { label: "C", value: "c" },
  { label: "C#", value: "csharp" },
  { label: "Go", value: "go" },
];

/** Cỡ tối đa cho file .sql seed nạp client-side (~512KB) — tránh nhét chuỗi khổng lồ vào gradingConfig. */
export const SEED_SQL_MAX_BYTES = 512 * 1024;

/**
 * challenge-testcase-sample-ui §3 (BE `challenge-testcase-samples` §4.1) — số lần AI NHẬN XÉT mỗi
 * học viên được dùng trên MỘT thử thách. BE kẹp 1..5 và mặc định 1; FE kẹp cùng biên để không gửi
 * giá trị BE sẽ lặng lẽ sửa lại (mentor tưởng đặt 10 mà thực tế là 5).
 */
export const AI_FEEDBACK_LIMIT_MIN = 1;
export const AI_FEEDBACK_LIMIT_MAX = 5;
export const AI_FEEDBACK_LIMIT_DEFAULT = 1;

/** Câu nói rõ vai trò của AI ở bài chấm bằng test case — dùng chung wizard + modal sửa. */
export const AI_FEEDBACK_LIMIT_HINT =
  "AI chỉ NHẬN XÉT bài làm — điểm do test case chấm. Hết lượt nhận xét thì học viên vẫn nộp và vẫn được chấm điểm bình thường.";

/**
 * Chuẩn hoá "Số lần AI nhận xét": trống / NaN / không phải số ⇒ mặc định 1; số lẻ ⇒ cắt phần thập
 * phân; ngoài biên ⇒ kẹp về 1..5 (KHÔNG để 0: 0 lượt nghĩa là tắt hẳn AI, BE không nhận).
 */
export function clampAiFeedbackLimit(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return AI_FEEDBACK_LIMIT_DEFAULT;
  return Math.min(Math.max(Math.trunc(value), AI_FEEDBACK_LIMIT_MIN), AI_FEEDBACK_LIMIT_MAX);
}

/**
 * Whitelist đuôi file (chuỗi ".zip,.sql,.py") có chứa .sql ⇒ cần seed dataset. So khớp từng token,
 * bỏ qua khoảng trắng / dấu chấm đầu / hoa-thường (".SQL", "sql", " .sql " đều tính là có sql).
 */
export function acceptsSqlExtension(fileExtension: string | undefined | null): boolean {
  if (!fileExtension) return false;
  return fileExtension
    .split(",")
    .some((token) => token.trim().replace(/^\./, "").toLowerCase() === "sql");
}

/** File cho phép nộp khi tác giả chọn FILE hoặc BOTH (mirror LessonAssignmentEditor cũ). */
export const allowsFile = (m: SubmissionMethod | undefined): boolean =>
  m === "FILE" || m === "BOTH";

/** CODE + kiểu bài NỘP ⇒ challenge mang submissionMethod + gradingConfig (không phải test case inline). */
export function isCodeSubmission(
  values: Pick<MetaForm, "type" | "codeInputStyle">
): boolean {
  return values.type === "CODE" && values.codeInputStyle === "SUBMISSION";
}

/**
 * challenge-testcase-sample-ui §3.2 — CODE chấm bằng TEST CASE. Chỉ ở đây "số lần AI nhận xét" mới
 * có nghĩa: MCQ chấm máy (không có AI), bài NỘP/ESSAY thì AI CHẤM ĐIỂM chứ không phải nhận xét
 * thêm (đã có cap riêng `PROJECT_GRADE_LIMIT` ở BE) — bày ô này ở đó là control giả.
 */
export function isCodeTestCase(values: Pick<MetaForm, "type" | "codeInputStyle">): boolean {
  return values.type === "CODE" && values.codeInputStyle === "TESTCASE";
}

/** Cấu hình chấm bài NỘP gói trong gradingConfig (chuỗi JSON) — rubric của Assignment cũ. */
export interface AssignmentGradingConfig {
  question?: string;
  expectedOutput?: string;
  criteria?: string;
  fileExtension?: string;
  /**
   * code-sandbox-assignment §2C: dataset .sql seed (visible cho learner — đây là dữ liệu để query,
   * KHÔNG phải đáp án). Chỉ gói khi bài NỘP + whitelist đuôi file chứa .sql.
   */
  seedSql?: string;
  /**
   * algo-testcase-starter §3: sườn code per-ngôn-ngữ (map ngôn ngữ→code). Learner-safe — lộ cho FE
   * prefill (import + khai báo hàm + khung đọc I/O), KHÔNG phải đáp án. Chỉ gói khi bài CODE test-case
   * có ít nhất 1 sườn. Bỏ hẳn key khi map rỗng (JSON.stringify tự loại undefined).
   */
  starterCode?: Record<string, string>;
  checkLogic: boolean;
  checkPerform: boolean;
  checkEdgeCase: boolean;
}

/**
 * Rows sườn code → map {ngôn ngữ→code} (algo-testcase-starter §3). Bỏ qua hàng thiếu ngôn ngữ hoặc
 * code rỗng (chỉ khoảng trắng); ngôn ngữ trim + lowercase để khớp key executor. GIỮ NGUYÊN code (kể
 * cả thụt đầu dòng / xuống dòng) — sườn cần đúng định dạng, KHÔNG trim thân code. Ngôn ngữ trùng: hàng
 * sau ghi đè hàng trước. Trả undefined khi không có sườn hợp lệ (để JSON.stringify loại hẳn key).
 */
export function buildStarterCodeMap(
  rows: StarterCodeRow[] | undefined
): Record<string, string> | undefined {
  if (!rows?.length) return undefined;
  const map: Record<string, string> = {};
  for (const row of rows) {
    const lang = row.language?.trim().toLowerCase();
    const code = row.code ?? "";
    if (lang && code.trim()) map[lang] = code;
  }
  return Object.keys(map).length ? map : undefined;
}

/** Map {ngôn ngữ→code} → rows cho editor (pre-fill sửa). Map rỗng/undefined → mảng rỗng. */
export function starterCodeMapToRows(
  map: Record<string, string> | undefined | null
): StarterCodeRow[] {
  if (!map) return [];
  return Object.entries(map).map(([language, code]) => ({ language, code }));
}

/**
 * Rubric bài NỘP (question/expectedOutput/criteria + check*) → chuỗi JSON gradingConfig. fileExtension
 * CHỈ đính khi cho phép nộp file (FILE/BOTH); seedSql CHỈ đính khi whitelist đuôi file chứa .sql
 * (dataset học viên query, seed tươi mỗi lần chạy); check* mặc định true. Trim + bỏ field rỗng cho gọn.
 */
export function buildAssignmentGradingConfig(values: MetaForm): string {
  const acceptsSql = allowsFile(values.submissionMethod) && acceptsSqlExtension(values.fileExtension);
  const cfg: AssignmentGradingConfig = {
    question: values.question?.trim() || undefined,
    expectedOutput: values.expectedOutput?.trim() || undefined,
    criteria: values.criteria?.trim() || undefined,
    fileExtension: allowsFile(values.submissionMethod)
      ? values.fileExtension?.trim() || undefined
      : undefined,
    seedSql: acceptsSql ? values.seedSql?.trim() || undefined : undefined,
    // algo-testcase-starter §3: sườn code learner-safe — CHỈ bài CODE test-case (thuật toán) mang, KHÔNG
    // phải bài NỘP (tránh rò rows còn sót khi tác giả gạt TESTCASE→SUBMISSION). Map rỗng → undefined
    // (JSON.stringify tự loại key).
    starterCode:
      values.codeInputStyle === "TESTCASE" ? buildStarterCodeMap(values.starterCode) : undefined,
    checkLogic: values.checkLogic ?? true,
    checkPerform: values.checkPerform ?? true,
    checkEdgeCase: values.checkEdgeCase ?? true,
  };
  return JSON.stringify(cfg);
}

export interface McqRow {
  question: string;
  options: { text: string; correct: boolean }[];
  points?: number;
}
export interface RubricRow {
  criterion: string;
  description?: string;
  maxScore?: number;
}
interface ContentForm {
  mcq?: McqRow[];
  testCases?: TestCaseRow[];
  rubrics?: RubricRow[];
}

// ---- Pure builders (unit test — task 3.2 admin-lesson-exercise-authoring) ----

/**
 * Bước 1 (meta) → CreateChallengeRequest. mode luôn INDIVIDUAL; slug rỗng → tự sinh từ title;
 * `courseId` CHỈ đính khi mode Kho truyền vào (additive admin-course-challenge-bank — chỗ gọi
 * cũ không truyền để giữ hành vi).
 *
 * challenge-testcase-editor §4.2: vế ĐÓNG của `range` được phép trống ⇒ gửi `endsAt: null`
 * (challenge mở vô hạn) thay vì đọc mù `values.range[1]` — trước đây dereference thẳng nên vừa nổ
 * runtime khi trống, vừa buộc mọi challenge phải có hạn đóng.
 */
export function buildCreateChallengePayload(
  values: MetaForm,
  courseId?: string
): CreateChallengeRequest {
  const [opensAt, closesAt] = values.range ?? [];
  const payload: CreateChallengeRequest = {
    title: values.title,
    slug: values.slug || slugify(values.title),
    description: values.description || undefined,
    type: values.type,
    mode: "INDIVIDUAL",
    startsAt: (opensAt ?? dayjs()).toISOString(),
    endsAt: closesAt ? closesAt.toISOString() : null,
    maxSubmissions: values.maxSubmissions,
    free: values.free,
    ...(courseId ? { courseId } : {}),
  };
  // admin-challenge-unified-form §④: CODE dạng bài NỘP → đính submissionMethod + gradingConfig
  // (rubric bài nộp). MCQ/ESSAY và CODE test-case-inline KHÔNG có 2 field này (giữ hành vi cũ).
  if (isCodeSubmission(values) && values.submissionMethod) {
    payload.submissionMethod = values.submissionMethod;
    payload.gradingConfig = buildAssignmentGradingConfig(values);
  } else if (values.type === "CODE" && buildStarterCodeMap(values.starterCode)) {
    // algo-testcase-starter §3: CODE test-case (thuật toán) — KHÔNG phải bài nộp (không submissionMethod)
    // nhưng vẫn cần gradingConfig để mang sườn code learner-safe. Chỉ đính khi có ≥1 sườn hợp lệ, để
    // giữ hành vi cũ (bài test-case không sườn ⇒ gradingConfig vẫn undefined).
    payload.gradingConfig = buildAssignmentGradingConfig(values);
  }
  // challenge-testcase-sample-ui §3.1: số lần AI NHẬN XÉT — flat field (BE merge vào grading_config
  // như fileExtension/seedSql), CHỈ đính cho bài CODE chấm bằng test case. Luôn gửi giá trị đã kẹp
  // 1..5 để mentor thấy đúng thứ được lưu; loại khác giữ nguyên hình dạng payload cũ.
  if (isCodeTestCase(values)) {
    payload.aiFeedbackLimit = clampAiFeedbackLimit(values.aiFeedbackLimit);
  }
  return payload;
}

/**
 * Rows MCQ → items upsert: key A..F theo vị trí, correctKeys từ ô tick, orderNo theo index,
 * points mặc định 1. Câu nào 0 đáp án đúng → {error} (chặn trước khi bắn request).
 */
export function buildMcqQuestionItems(
  rows: McqRow[]
):
  | { questions: ChallengeMcqQuestionItem[]; error?: undefined }
  | { questions?: undefined; error: string } {
  const questions: ChallengeMcqQuestionItem[] = [];
  for (const [qi, q] of rows.entries()) {
    const options = q.options.map((o, i) => ({
      key: OPTION_KEYS[i] ?? String(i + 1),
      text: o.text,
    }));
    const correctKeys = q.options
      .map((o, i) => (o.correct ? (OPTION_KEYS[i] ?? String(i + 1)) : null))
      .filter((k): k is string => k !== null);
    const err = validateCorrectKeys("MULTIPLE_CHOICE", correctKeys);
    if (err) return { error: err };
    questions.push({ question: q.question, options, correctKeys, points: q.points ?? 1, orderNo: qi });
  }
  return { questions };
}

/** Rows rubric (CODE/ESSAY) → items upsert: default description "", maxScore 10, orderNo theo index. */
export function buildRubricItems(rows: RubricRow[]): ChallengeRubricItem[] {
  return rows.map((r, i) => ({
    criterion: r.criterion,
    description: r.description ?? "",
    maxScore: r.maxScore ?? 10,
    orderNo: i,
  }));
}

/**
 * Gate nút Publish bước 3 (pure): mode lesson BẮT BUỘC gắn xong mới publish; mode Kho
 * (bankMode) publish được ngay không cần gắn (challenge nằm kho).
 */
export function isPublishBlocked(bankMode: boolean, linked: boolean): boolean {
  return !bankMode && !linked;
}

/** Nhận diện lỗi "lesson đã có challenge active" khi gắn (errorCode BE hoặc HTTP 409). */
export function isLessonLinkConflict(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    (err.errorCode === "CHALLENGE_LESSON_ALREADY_ATTACHED" || err.code === 409)
  );
}

export function ChallengeWizardDrawer({
  lessonId,
  courseId,
  lessonOptions,
  open,
  disabled,
  occupyingChallenge = null,
  onClose,
  onMutated,
}: ChallengeWizardDrawerProps) {
  const [metaForm] = Form.useForm<MetaForm>();
  const [contentForm] = Form.useForm<ContentForm>();
  const slugTouched = useRef(false);

  // Mode Kho = không có lessonId cố định ⇒ bước 3 chọn lesson course-scoped, skippable.
  const bankMode = !lessonId;

  const [step, setStep] = useState(0);
  const [challenge, setChallenge] = useState<ChallengeView | null>(null);
  const [type, setType] = useState<ChallengeType>("MULTIPLE_CHOICE");
  // admin-challenge-unified-form §④: CODE chọn test case inline vs bài NỘP; submissionMode = challenge
  // VỪA tạo là bài nộp (bước Nội dung khỏi soạn test case/rubric — đã gói vào gradingConfig lúc tạo).
  const [codeInputStyle, setCodeInputStyle] = useState<CodeInputStyle>("TESTCASE");
  const [submissionMode, setSubmissionMode] = useState(false);
  const [linked, setLinked] = useState(false);
  const [linkConflict, setLinkConflict] = useState<string | null>(null);
  // Lesson người dùng chọn ở picker (mode Kho); mode lesson dùng thẳng prop lessonId.
  const [pickedLessonId, setPickedLessonId] = useState<string | undefined>(undefined);
  const effectiveLessonId = lessonId ?? pickedLessonId;

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
    setCodeInputStyle("TESTCASE");
    setSubmissionMode(false);
    setLinked(false);
    setLinkConflict(null);
    setPickedLessonId(undefined);
    metaForm.setFieldsValue({
      title: "",
      slug: "",
      description: "",
      type: "MULTIPLE_CHOICE",
      // challenge-testcase-editor §4.2: mặc định KHÔNG đặt hạn đóng (mở vô hạn). Default cũ
      // `+1 năm` là hạn giả — tác giả không để ý là challenge tự CLOSED sau 1 năm.
      range: [dayjs(), null],
      maxSubmissions: 10,
      free: false,
      codeInputStyle: "TESTCASE",
      submissionMethod: "GITHUB",
      fileExtension: "",
      question: "",
      expectedOutput: "",
      criteria: "",
      seedSql: "",
      starterCode: [],
      aiFeedbackLimit: AI_FEEDBACK_LIMIT_DEFAULT,
      checkLogic: true,
      checkPerform: true,
      checkEdgeCase: true,
    });
    contentForm.setFieldsValue({
      mcq: [{ question: "", options: [{ text: "", correct: false }, { text: "", correct: false }], points: 1 }],
      testCases: [emptyTestCaseRow(0)],
      rubrics: [{ criterion: "", description: "", maxScore: 10 }],
    });
  }, [open, metaForm, contentForm]);

  const handleMetaChange = (changed: Partial<MetaForm>) => {
    if (changed.slug !== undefined) slugTouched.current = true;
    if (changed.title !== undefined && !slugTouched.current) {
      metaForm.setFieldValue("slug", slugify(changed.title ?? ""));
    }
    if (changed.type !== undefined) setType(changed.type);
    if (changed.codeInputStyle !== undefined) setCodeInputStyle(changed.codeInputStyle);
  };

  // Bước 1 → tạo challenge
  const handleCreate = (values: MetaForm) => {
    // CODE bài NỘP: gradingConfig đã đính trong payload → bước Nội dung khỏi soạn test case/rubric.
    const codeSubmission = isCodeSubmission(values) && Boolean(values.submissionMethod);
    createChallenge.mutate(
      buildCreateChallengePayload(values, courseId),
      {
        onSuccess: (c) => {
          setChallenge(c);
          setType(values.type);
          setSubmissionMode(codeSubmission);
          setStep(1);
          onMutated?.();
        },
        onError: handleAdminMutationError,
      }
    );
  };

  // Bước 2 → nội dung theo type
  const handleContent = (values: ContentForm) => {
    if (!challenge) return;
    if (type === "MULTIPLE_CHOICE") {
      const built = buildMcqQuestionItems(values.mcq ?? []);
      if (!built.questions) {
        message.error(built.error);
        return;
      }
      upsertMcq.mutate(
        { id: challenge.id, questions: built.questions },
        { onSuccess: () => setStep(2), onError: handleAdminMutationError }
      );
      return;
    }
    if (type === "CODE") {
      // Bài NỘP: nội dung chấm đã gói vào gradingConfig lúc tạo → không có test case/rubric structured,
      // sang thẳng bước gắn & publish.
      if (submissionMode) {
        setStep(2);
        return;
      }
      const testCases = buildTestCaseItems(values.testCases ?? []);
      const rubrics = buildRubricItems(values.rubrics ?? []);
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
    upsertRubrics.mutate(
      { id: challenge.id, rubrics: buildRubricItems(values.rubrics ?? []) },
      { onSuccess: () => setStep(2), onError: handleAdminMutationError }
    );
  };

  // Bước 3 → gắn lesson
  const handleLink = () => {
    if (!challenge || !effectiveLessonId) return;
    setLinkConflict(null);
    linkLesson.mutate(
      { id: challenge.id, lessonId: effectiveLessonId },
      {
        onSuccess: () => {
          setLinked(true);
          message.success("Đã gắn challenge vào bài học");
          onMutated?.();
        },
        onError: (err) => {
          if (isLessonLinkConflict(err)) {
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
          onMutated?.();
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
      title={bankMode ? "Tạo thử thách cho kho khoá học" : "Tạo challenge cho bài học"}
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
            {/* challenge-testcase-editor §4.1: vế ĐÓNG bỏ trống được ⇒ challenge mở vô hạn
                (BE nhận endsAt=null, scheduler không auto-CLOSE). `required` chỉ còn áp cho vế MỞ
                — rule mảng của AntD không phân biệt được 2 vế nên phải tự validate. */}
            <Form.Item
              name="range"
              label="Thời gian mở → đóng"
              tooltip="Để trống ô ĐÓNG nếu muốn thử thách mở vô hạn (không tự đóng)."
              extra="Bỏ trống vế đóng = Không giới hạn"
              rules={[
                {
                  validator: (_rule, value: [Dayjs | null, Dayjs | null] | undefined) =>
                    value?.[0]
                      ? Promise.resolve()
                      : Promise.reject(new Error("Chọn thời gian mở")),
                },
              ]}
            >
              <DatePicker.RangePicker
                showTime
                allowEmpty={[false, true]}
                placeholder={["Thời gian mở", "Không giới hạn"]}
              />
            </Form.Item>
            <Form.Item name="maxSubmissions" label="Số lần nộp tối đa" rules={[{ required: true }]}>
              <InputNumber min={1} />
            </Form.Item>
            <Form.Item
              name="free"
              label="Cho làm miễn phí (học thử)"
              valuePropName="checked"
              tooltip="Học viên học thử / chưa mua vẫn làm được thử thách này khi bài học đang mở (miễn phí/trial)."
            >
              <Switch />
            </Form.Item>
          </Space>

          {/* admin-challenge-unified-form §④: CODE chọn kiểu nhập bài làm — test case inline (chấm tự
              động) HOẶC bài NỘP (GitHub/File → AI chấm theo rubric). Bài nộp gói cấu hình vào payload
              tạo (submissionMethod + gradingConfig); test case inline soạn ở bước Nội dung như cũ. */}
          {type === "CODE" && (
            <>
              <Divider orientation="left">Kiểu bài CODE</Divider>
              <Form.Item name="codeInputStyle" label="Chọn kiểu bài CODE" rules={[{ required: true }]}>
                <Radio.Group optionType="button" buttonStyle="solid">
                  <Radio.Button value="TESTCASE">Test case (chấm tự động)</Radio.Button>
                  <Radio.Button value="SUBMISSION">Bài nộp / Project (AI chấm)</Radio.Button>
                </Radio.Group>
              </Form.Item>
              <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: -8 }}>
                • <strong>Test case (chấm tự động)</strong>: học viên viết code, hệ thống chấm tự động
                theo <strong>input/output</strong> (soạn từng test case ở bước Nội dung); có thể kèm sườn
                code khởi tạo.
                <br />• <strong>Bài nộp / Project</strong>: học viên nộp <strong>GitHub / File</strong>{" "}
                (project), AI chấm theo rubric — <strong>KHÔNG có test case, KHÔNG có vùng code</strong>.
              </Typography.Paragraph>

              {codeInputStyle === "SUBMISSION" && (
                <>
                  <Form.Item
                    name="submissionMethod"
                    label="Cách nộp bài"
                    tooltip="Nộp bằng file cũng là một loại bài, không chỉ project/GitHub."
                    rules={[{ required: true, message: "Chọn cách nộp" }]}
                  >
                    <Radio.Group>
                      <Radio.Button value="GITHUB">GitHub URL</Radio.Button>
                      <Radio.Button value="FILE">Nộp file</Radio.Button>
                      <Radio.Button value="BOTH">Cả hai</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                  <Form.Item
                    noStyle
                    shouldUpdate={(prev, cur) =>
                      prev.submissionMethod !== cur.submissionMethod ||
                      prev.fileExtension !== cur.fileExtension
                    }
                  >
                    {({ getFieldValue }) =>
                      allowsFile(getFieldValue("submissionMethod") as SubmissionMethod) ? (
                        <>
                          <Form.Item
                            name="fileExtension"
                            label="Đuôi file nhận (whitelist)"
                            tooltip="Danh sách đuôi file được phép nộp, ngăn cách bởi dấu phẩy."
                            rules={[{ required: true, message: "Nhập đuôi file khi cho phép nộp file" }]}
                          >
                            <Input placeholder=".zip,.sql,.py" style={{ width: 240 }} />
                          </Form.Item>
                          {/* code-sandbox-assignment §2C: whitelist chứa .sql ⇒ bắt buộc upload seed
                              dataset. Đọc nội dung file client-side (FileReader) → lưu text vào seedSql,
                              gói vào gradingConfig (không upload storage). */}
                          {acceptsSqlExtension(getFieldValue("fileExtension") as string | undefined) && (
                            <Form.Item
                              name="seedSql"
                              label="File .sql seed (bắt buộc)"
                              rules={[{ required: true, message: "Tải lên file .sql seed" }]}
                              tooltip="seed .sql sẽ được chạy tạo dữ liệu trước mỗi lần học viên chạy query (seed tươi mỗi lần)."
                            >
                              <SeedSqlUpload />
                            </Form.Item>
                          )}
                        </>
                      ) : null
                    }
                  </Form.Item>
                  <Form.Item name="question" label="Đề bài" rules={[{ required: true, message: "Nhập đề bài" }]}>
                    <Input.TextArea rows={3} />
                  </Form.Item>
                  <Form.Item name="expectedOutput" label="Kết quả mong đợi">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                  <Form.Item name="criteria" label="Tiêu chí chấm">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                  <Form.Item label="Nội dung chấm">
                    <Space size="large">
                      <Form.Item name="checkLogic" valuePropName="checked" noStyle>
                        <Checkbox>Logic</Checkbox>
                      </Form.Item>
                      <Form.Item name="checkPerform" valuePropName="checked" noStyle>
                        <Checkbox>Hiệu năng</Checkbox>
                      </Form.Item>
                      <Form.Item name="checkEdgeCase" valuePropName="checked" noStyle>
                        <Checkbox>Edge case</Checkbox>
                      </Form.Item>
                    </Space>
                  </Form.Item>
                </>
              )}

              {/* algo-testcase-starter §3: bài CODE test-case (thuật toán) — soạn sườn code per-ngôn-ngữ
                  (learner-safe). Gói vào gradingConfig.starterCode lúc TẠO (mirror seedSql). Test case
                  chấm tự động vẫn soạn ở bước Nội dung (Form.List testCases). */}
              {codeInputStyle === "TESTCASE" && (
                <>
                  {/* challenge-testcase-sample-ui §3.2: chỉ bài CODE chấm bằng TEST CASE mới có ô
                      này — điểm đã do test case quyết, AI chỉ là góp ý nên phải có trần rõ ràng. */}
                  <Form.Item
                    name="aiFeedbackLimit"
                    label="Số lần AI nhận xét"
                    tooltip={AI_FEEDBACK_LIMIT_HINT}
                    extra={`Mỗi học viên được ${AI_FEEDBACK_LIMIT_MIN}–${AI_FEEDBACK_LIMIT_MAX} lượt trên thử thách này. ${AI_FEEDBACK_LIMIT_HINT}`}
                  >
                    <InputNumber
                      min={AI_FEEDBACK_LIMIT_MIN}
                      max={AI_FEEDBACK_LIMIT_MAX}
                      placeholder={String(AI_FEEDBACK_LIMIT_DEFAULT)}
                      style={{ width: 140 }}
                    />
                  </Form.Item>

                  <Divider orientation="left">Sườn code theo ngôn ngữ (tuỳ chọn)</Divider>
                  <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
                    Sườn (import + khai báo hàm + khung đọc I/O) để học viên bắt đầu — learner-safe, KHÔNG
                    phải đáp án. Mỗi ngôn ngữ một sườn. Test case chấm tự động soạn ở bước Nội dung.
                  </Typography.Paragraph>
                  <StarterCodeEditor />
                </>
              )}
            </>
          )}

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

          {type === "CODE" && submissionMode && (
            <Alert
              type="info"
              showIcon
              message="Bài nộp (GitHub/File)"
              description="Cách nộp và tiêu chí chấm đã cấu hình ở bước Thông tin — không cần test case. Nhấn tiếp tục để sang bước gắn & publish."
              style={{ marginBottom: 8 }}
            />
          )}

          {type === "CODE" && !submissionMode && (
            <>
              {/* challenge-testcase-editor §1.3: dùng chung `TestCaseEditor` với trình sửa sau khi
                  tạo (TestCaseManagerDrawer) — luồng tạo KHÔNG đổi hình dạng, vẫn là Form.List
                  "testCases" của contentForm, chỉ khác là multi-line + giới hạn per-case. */}
              <Divider orientation="left">Test cases</Divider>
              <TestCaseEditor disabled={disabled} />
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
          {/* Không render nút "Quay lại": challenge đã persist ở bước 0, back sửa meta không hỗ trợ
              → ẩn hẳn thay vì hiện 1 control disabled vô dụng (gây rối UX). */}
          <Button
            type="primary"
            htmlType="submit"
            loading={upsertMcq.isPending || upsertTestCases.isPending || upsertRubrics.isPending}
          >
            Lưu nội dung & tiếp tục
          </Button>
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
          {bankMode ? (
            <>
              <Typography.Paragraph>
                Thử thách <Typography.Text strong>{challenge?.title}</Typography.Text> đã nằm
                trong kho khoá học. Bạn có thể gắn vào một bài học của khoá (không bắt buộc), rồi
                Publish để có thể public lên Workplace sau này.
              </Typography.Paragraph>
              {!linked && (
                <Form.Item label="Gắn vào bài học (có thể bỏ qua)" style={{ maxWidth: 480 }}>
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Chọn bài học trong khoá này"
                    value={pickedLessonId}
                    onChange={(v) => setPickedLessonId(v)}
                    options={lessonOptions ?? []}
                    disabled={disabled}
                    notFoundContent="Khoá chưa có bài học"
                  />
                </Form.Item>
              )}
            </>
          ) : (
            <Typography.Paragraph>
              Gắn challenge <Typography.Text strong>{challenge?.title}</Typography.Text> vào bài
              học hiện tại, sau đó Publish để học viên thấy.
            </Typography.Paragraph>
          )}
          <Space>
            {!linked && (
              <Button
                type="primary"
                onClick={handleLink}
                loading={linkLesson.isPending}
                disabled={disabled || !effectiveLessonId}
              >
                Gắn vào bài học
              </Button>
            )}
            <Button
              type="primary"
              onClick={handlePublish}
              loading={publishChallenge.isPending}
              disabled={disabled || isPublishBlocked(bankMode, linked)}
            >
              Publish
            </Button>
          </Space>
        </>
      )}
    </Drawer>
  );
}

/**
 * Control nạp file .sql seed (code-sandbox-assignment §2C) — hoạt động như 1 form control: nhận
 * `value` (chuỗi seedSql) + `onChange`. Đọc file phía CLIENT bằng FileReader (không upload mạng),
 * chặn file quá lớn (SEED_SQL_MAX_BYTES). Mirror single-file upload của LessonDocumentsPanel nhưng
 * lưu TEXT thay vì POST multipart. `beforeUpload` luôn trả false để AntD không tự upload.
 */
export function SeedSqlUpload({
  value,
  onChange,
}: {
  value?: string;
  onChange?: (val: string) => void;
}) {
  const [fileName, setFileName] = useState<string | null>(null);

  const handlePick = (file: File): boolean => {
    if (file.size > SEED_SQL_MAX_BYTES) {
      message.error("File .sql seed quá lớn (tối đa 512KB).");
      return false; // reject — chặn AntD tự upload
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setFileName(file.name);
      onChange?.(text);
    };
    reader.onerror = () => message.error("Không đọc được file .sql seed.");
    reader.readAsText(file);
    return false; // luôn chặn upload mạng — ta lưu text client-side
  };

  // Đếm BYTE (UTF-8) cho khớp cách kiểm cỡ (file.size, bytes) — value.length đếm code unit UTF-16 nên
  // SQL nhiều byte (dấu tiếng Việt / ký tự ngoài ASCII) sẽ báo thiếu "~N KB".
  const loadedKb = value ? Math.max(1, Math.round(new TextEncoder().encode(value).length / 1024)) : 0;

  return (
    <Space direction="vertical" size={4} style={{ width: "100%" }}>
      <Upload accept=".sql" maxCount={1} showUploadList={false} beforeUpload={handlePick}>
        <Button icon={<UploadOutlined />}>
          {value ? "Chọn file .sql khác" : "Tải lên file .sql seed"}
        </Button>
      </Upload>
      {value ? (
        <Typography.Text type="success" style={{ fontSize: 12 }}>
          Đã nạp seed{fileName ? ` · ${fileName}` : ""} · ~{loadedKb} KB
        </Typography.Text>
      ) : null}
    </Space>
  );
}

/**
 * Editor sườn code per-ngôn-ngữ (algo-testcase-starter §3) — Form.List name="starterCode": mỗi hàng
 * 1 Select ngôn ngữ + 1 TextArea skeleton. Dùng CHUNG cho wizard TẠO (metaForm bước 1) và modal SỬA.
 * List tuỳ chọn: bắt đầu rỗng, mentor bấm "Thêm ngôn ngữ" để soạn từng sườn; buildStarterCodeMap sẽ
 * bỏ hàng thiếu ngôn ngữ hoặc code rỗng. TextArea giữ nguyên thụt dòng (monospace, không trim thân).
 */
export function StarterCodeEditor() {
  return (
    <Form.List name="starterCode">
      {(fields, { add, remove }) => (
        <>
          {fields.map(({ key, name, ...rf }) => (
            <div
              key={key}
              style={{ border: "1px solid #f0f0f0", padding: 12, marginBottom: 12, borderRadius: 6 }}
            >
              <Space style={{ marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                <Form.Item
                  {...rf}
                  name={[name, "language"]}
                  rules={[{ required: true, message: "Chọn ngôn ngữ" }]}
                  style={{ marginBottom: 0 }}
                >
                  <Select
                    options={STARTER_CODE_LANGUAGES}
                    placeholder="Ngôn ngữ"
                    style={{ width: 180 }}
                  />
                </Form.Item>
                <MinusCircleOutlined onClick={() => remove(name)} />
              </Space>
              <Form.Item {...rf} name={[name, "code"]} style={{ marginBottom: 0 }}>
                <Input.TextArea
                  rows={6}
                  placeholder={"import ...\n\ndef solve():\n    # TODO\n    pass"}
                  style={{ fontFamily: "monospace" }}
                />
              </Form.Item>
            </div>
          ))}
          <Button
            type="dashed"
            onClick={() => add({ language: undefined, code: "" })}
            icon={<PlusOutlined />}
          >
            Thêm ngôn ngữ
          </Button>
        </>
      )}
    </Form.List>
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
