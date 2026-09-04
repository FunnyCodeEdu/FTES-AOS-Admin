// API client cho khu "Trợ lý AI" giảng viên. Endpoint nằm dưới /api/v1/ai (khác base
// mặc định /api/v1/admin của apiClient) → override baseURL per-request để vẫn dùng chung
// interceptor (auth Bearer + refresh 401 + bóc envelope). Mirror pattern features/ai/api.
//
// Job submit trả envelope code 1002 ("Accepted", data = JobRef) — interceptor bóc được nhờ
// isEnvelopeSuccess nhận 1002 (shared/api/client.ts). r.data (đã bóc) = JobRef/JobView/MentorResult.

import { apiClient } from "../../../../shared/api/client";
import type {
  AiModelCatalog,
  DifficultyRequest,
  DraftSession,
  ExamGenerateRequest,
  JobRef,
  JobView,
  LessonDocDraft,
  LessonDocRequest,
  MentorCohortInsightRequest,
  MentorFeedbackAssistRequest,
  MentorResult,
  MentorStudentBriefRequest,
  TeacherGradeRequest,
} from "../types";

const AI_BASE = `${import.meta.env.VITE_API_BASE_URL ?? ""}/api/v1/ai`;

// --- Teacher jobs (async → JobRef, poll GET /jobs/{id}) ---

/** POST /ai/teacher/exam-generate → JobRef (envelope 1002). Gác ai.teacher.use. */
export function submitExamGenerate(body: ExamGenerateRequest): Promise<JobRef> {
  return apiClient
    .post("/teacher/exam-generate", body, { baseURL: AI_BASE })
    .then((r) => r.data as JobRef);
}

/**
 * Một bản nháp challenge do AI sinh. CÙNG shape cho cả hai đường (dán đề / sinh từ bài học) — đó là
 * ràng buộc cố ý của thiết kế: lệch shape thì phải dựng hai màn xem trước cho cùng một việc.
 */
export interface ChallengeDraft {
  type: string;
  title: string;
  description: string;
  difficulty?: string | null;
  tags?: string[] | null;
  /** Chỉ có với loại chấm bằng test case (CODE/CODING/SQL). */
  test_cases?: Array<{ input: string; expected: string; hidden?: boolean; weight?: number }> | null;
  /**
   * Chỉ có với MULTIPLE_CHOICE. Phương án là {key,text} và đáp án trả về theo KEY ("A"), khớp
   * McqQuestionItem/OptionItem của BE — bản đầu tôi khai options là string[] và đáp án nguyên văn,
   * đội AI đọc source BE và sửa lại cho đúng.
   *
   * KHÔNG có `explanation`: bảng challenge.mcq_questions không có cột đó, trả một field mentor sửa
   * được rồi biến mất lúc lưu còn tệ hơn không có.
   */
  mcq?: Array<{
    question: string;
    options: Array<{ key: string; text: string }>;
    correct_keys: string[];
    points?: number | null;
  }> | null;
  /** Chỉ có với loại chấm bằng rubric (ESSAY/UIUX/BUSINESS). `max_score` khớp RubricItem của BE. */
  rubric?: Array<{ criterion: string; description?: string; max_score: number }> | null;
  grading_config?: Record<string, unknown> | null;
  /**
   * Dưới 0.6 thì màn xem trước cảnh báo giảng viên rà kỹ. Mảng RỖNG (khác null) nghĩa là loại này
   * có phần đó nhưng model không nghĩ ra được cái nào — khi ấy dịch vụ AI tự hạ confidence ≤ 0.4.
   */
  confidence?: number | null;
  /** Model ĐÃ THỰC SỰ trả lời (dịch vụ AI có thể rơi xuống model dự phòng). */
  model?: string | null;
}

/** Kết quả job CHALLENGE_GEN — worker chuẩn hoá cả hai đường về đúng shape này. */
export interface ChallengeGenResult {
  drafts: ChallengeDraft[];
  model?: string;
}

/** POST /ai/authoring/challenge/draft — giảng viên DÁN đề thô, AI tự phân tích và điền. */
export function submitChallengeDraft(body: {
  prompt: string;
  type?: string;
  language?: string;
  context?: Record<string, unknown>;
}): Promise<JobRef> {
  return apiClient
    .post("/authoring/challenge/draft", body, { baseURL: AI_BASE })
    .then((r) => r.data as JobRef);
}

/** POST /ai/authoring/challenge/from-lesson — chọn một bài, xin N bản nháp để tick chọn. */
export function submitChallengeFromLesson(body: {
  lessonId: string;
  type?: string;
  count?: number;
  difficulty?: string;
  language?: string;
}): Promise<JobRef> {
  return apiClient
    .post("/authoring/challenge/from-lesson", body, { baseURL: AI_BASE })
    .then((r) => r.data as JobRef);
}

/** POST /ai/teacher/difficulty → JobRef. Gác ai.teacher.use. */
export function submitDifficulty(body: DifficultyRequest): Promise<JobRef> {
  return apiClient
    .post("/teacher/difficulty", body, { baseURL: AI_BASE })
    .then((r) => r.data as JobRef);
}

/** POST /ai/teacher/grade → JobRef. Gác ai.teacher.grade (v1 chưa có UI, giữ để tái dùng). */
export function submitTeacherGrade(body: TeacherGradeRequest): Promise<JobRef> {
  return apiClient
    .post("/teacher/grade", body, { baseURL: AI_BASE })
    .then((r) => r.data as JobRef);
}

/**
 * GET /ai/jobs/{id} → JobView. 404 (job không tồn tại / không thuộc caller) → interceptor
 * ném ApiError(404). Poll hook dừng khi status terminal.
 */
export function getAiJob(id: string): Promise<JobView> {
  return apiClient.get(`/jobs/${id}`, { baseURL: AI_BASE }).then((r) => r.data as JobView);
}

// --- AI soạn thảo lesson (feature D — SSE session) ---

/**
 * POST /ai/sessions {feature:"LESSON_SUGGESTION", contextRef:{lessonId}} → SessionView (envelope 200).
 * BE grounding tự ghép metadata lesson/course từ contextRef → FE chỉ gửi INTENT ở message. Gác kép:
 * controller `ai.chat.use` + per-feature `LESSON_SUGGESTION → ai.teacher.use` (LECTURER có cả 2, V134).
 * `model` optional (session-level); message có thể override từng lượt.
 */
export function createLessonDraftSession(lessonId: string, model?: string): Promise<DraftSession> {
  return apiClient
    .post(
      "/sessions",
      { feature: "LESSON_SUGGESTION", contextRef: { lessonId }, model: model ?? null },
      { baseURL: AI_BASE },
    )
    .then((r) => r.data as DraftSession);
}

/**
 * GET /ai/models → catalog {models[], defaults{...}} (proxy ftes-ai-service /v2/models). Chỉ cần
 * đăng nhập. Dùng cho model picker optional; caller ẩn picker khi call lỗi.
 */
export function fetchAiModels(): Promise<AiModelCatalog> {
  return apiClient.get("/models", { baseURL: AI_BASE }).then((r) => (r.data ?? {}) as AiModelCatalog);
}

/**
 * POST /ai/authoring/lesson-document → LessonDocDraft (one-shot sinh cả bài). BE proxy camel→snake
 * passthrough sang ai-service, gác ai.teacher.use, KHÔNG persist (giảng viên tự lưu qua editor).
 */
export function generateLessonDocument(body: LessonDocRequest): Promise<LessonDocDraft> {
  return apiClient
    .post("/authoring/lesson-document", body, { baseURL: AI_BASE })
    .then((r) => r.data as LessonDocDraft);
}

// --- Mentor (sync → JsonNode) ---

/** POST /ai/mentor/student-brief. Gác ai.teacher.use. */
export function mentorStudentBrief(body: MentorStudentBriefRequest): Promise<MentorResult> {
  return apiClient
    .post("/mentor/student-brief", body, { baseURL: AI_BASE })
    .then((r) => (r.data ?? {}) as MentorResult);
}

/** POST /ai/mentor/feedback-assist. Gác ai.teacher.use. */
export function mentorFeedbackAssist(body: MentorFeedbackAssistRequest): Promise<MentorResult> {
  return apiClient
    .post("/mentor/feedback-assist", body, { baseURL: AI_BASE })
    .then((r) => (r.data ?? {}) as MentorResult);
}

/** POST /ai/mentor/cohort-insight. Gác ai.teacher.use. */
export function mentorCohortInsight(body: MentorCohortInsightRequest): Promise<MentorResult> {
  return apiClient
    .post("/mentor/cohort-insight", body, { baseURL: AI_BASE })
    .then((r) => (r.data ?? {}) as MentorResult);
}
