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
