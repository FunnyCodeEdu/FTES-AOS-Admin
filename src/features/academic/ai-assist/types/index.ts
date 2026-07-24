// Types cho khu "Trợ lý AI" của giảng viên (academic console).
// Field khớp backend AI endpoints: JobController (/api/v1/ai/teacher/*, /jobs/{id})
// và MentorController (/api/v1/ai/mentor/*). Đọc trực tiếp record request/JobView của BE.

// --- Job async (teacher/*) ---

/**
 * Trạng thái job — mirror BE `AiJobStatus`. Terminal = COMPLETED | FAILED | CANCELLED;
 * PENDING/RUNNING = còn chạy (poll tiếp).
 */
export type AiJobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

/** Kết quả submit job (envelope code 1002, data = JobRef). BE: JobController.JobRef. */
export interface JobRef {
  jobId: string;
  /** BE trả "PENDING" ngay khi enqueue. */
  status: string;
}

/**
 * Trạng thái job khi poll GET /ai/jobs/{id}. BE: JobController.JobView.
 * `result` là STRING (JSON-encoded cho tool có cấu trúc như EXAM_GEN/DIFFICULTY,
 * hoặc markdown thô) — parse ở tầng hook/UI, không phải object sẵn.
 */
export interface JobView {
  id: string;
  feature: string;
  status: AiJobStatus;
  result: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

// --- Teacher job requests ---

export type AiDifficultyLevel = "EASY" | "MEDIUM" | "HARD";

/**
 * Sinh đề (POST /ai/teacher/exam-generate). BE guardLecturerScope cần ÍT NHẤT MỘT tham
 * chiếu lecturer-owned: lessonId | subjectId (topic-only KHÔNG đủ — sẽ 400 AI_INPUT_INVALID).
 * questionCount/difficulty/topic/language nằm trong whitelist LECTURER_EXTRA_FIELDS.
 */
export interface ExamGenerateRequest {
  lessonId?: string;
  subjectId?: string;
  topic?: string;
  questionCount: number;
  difficulty: AiDifficultyLevel;
  language?: string;
}

/** Phân tích độ khó quiz (POST /ai/teacher/difficulty). quizId = tham chiếu lecturer-owned. */
export interface DifficultyRequest {
  quizId: string;
}

/** Chấm bài (POST /ai/teacher/grade) — v1 chưa có UI riêng, giữ client để tái dùng. */
export interface TeacherGradeRequest {
  submissionId: string;
}

// --- Mentor sync requests (MentorController) ---
// BE nhận cả camelCase lẫn snake_case cho khóa chính; client gửi camelCase.
// `signals`/`metrics` là JSON tự do do mentor dựng từ dữ liệu họ có quyền xem.

export interface MentorStudentBriefRequest {
  /** BẮT BUỘC (BE 400 AI_MENTOR_INVALID nếu thiếu). Alias, KHÔNG PII. */
  studentAlias: string;
  signals?: unknown;
  language?: string;
  model?: string;
}

export interface MentorFeedbackAssistRequest {
  /** BẮT BUỘC. Nội dung bài nộp / ngữ cảnh (<= 200k chars). */
  submission: string;
  rubric?: string;
  tone?: string;
  language?: string;
  model?: string;
}

export interface MentorCohortInsightRequest {
  /** BẮT BUỘC. Mô tả cohort/lớp. */
  cohort: string;
  metrics?: unknown;
  language?: string;
  model?: string;
}

/**
 * Response 3 endpoint mentor = JsonNode tự do (ai-service trả). Đọc phòng thủ ở UI:
 * thường có `output`/`content`/`text` (markdown) + `model`. Không ép shape cứng.
 */
export type MentorResult = Record<string, unknown>;

// --- AI soạn thảo lesson (feature D) ---

/** Session tạo cho AI soạn thảo (subset SessionView của BE — chỉ dùng id). */
export interface DraftSession {
  id: string;
  feature: string;
}

/**
 * Catalog model (GET /ai/models, proxy ftes-ai-service /v2/models). Shape passthrough JsonNode →
 * đọc phòng thủ: `models` có thể là mảng string hoặc object {id/name/model}. Không ép cứng.
 */
export interface AiModelCatalog {
  models?: unknown;
  defaults?: Record<string, unknown>;
}

// --- AI sinh CẢ bài học một phát (feature F5) ---

/**
 * Yêu cầu sinh bài học document (POST /ai/authoring/lesson-document). Gửi camelCase; BE proxy
 * camel→snake passthrough sang ai-service. `topic` bắt buộc; còn lại tuỳ chọn để định hướng AI.
 */
export interface LessonDocRequest {
  topic: string;
  subject?: string;
  outline?: string[];
  level?: string;
  language?: string;
  lessonText?: string;
  lessonRef?: string;
  model?: string;
}

/**
 * Kết quả draft từ ai-service (BE trả nguyên JSON snake_case, KHÔNG persist). `body_md` = markdown
 * đầy đủ để chèn vào editor; `sections` là bố cục gợi ý; `grounded` cho biết có bám ngữ cảnh không.
 */
export interface LessonDocDraft {
  title: string;
  body_md: string;
  sections: Array<{ heading: string; body_md: string }>;
  reading_minutes: number;
  grounded: boolean;
  model: string;
}
