// Types cho tab "Bài tập" per-lesson (admin-lesson-exercise-authoring).
// Khớp DTO backend: course/web/dto/CourseDtos.java + challenge/web/dto/ChallengeViews.java.

export type QuizQuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";
export type QuizStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface OptionDto {
  key: string;
  text: string;
}

// GET /courses/lessons/{id}/quizzes?includeDrafts=true
export interface QuizSummaryView {
  id: string;
  lessonId: string;
  title: string;
  description: string | null;
  passScorePercent: number;
  timeLimitSeconds: number | null;
  maxAttempts: number | null;
  questionCount: number;
  status: string; // DRAFT | PUBLISHED | ARCHIVED (chỉ trả khi includeDrafts)
  myAttemptCount: number | null;
  myBestPercent: number | null;
  myPassed: boolean | null;
}

export interface CreateQuizRequest {
  title: string;
  description?: string;
  passScorePercent: number;
  timeLimitSeconds?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
}

export interface CreateQuestionRequest {
  question: string;
  type: QuizQuestionType;
  options: OptionDto[];
  correctKeys: string[];
  explanation?: string;
  points?: number;
  sortOrder: number;
}

/**
 * [C3] Cách nộp bài NỘP (legacy ftes "exercise") — first-class choice, KHÔNG chỉ project/github:
 * - GITHUB: nộp URL repo GitHub (https-only, SSRF-guarded ở BE).
 * - FILE: nộp file code/zip -> AI chấm (mirror FunnyCodeEdu ExerciseController submit-and-grade).
 * - BOTH: cho phép cả hai, FE solver hiện 2 tab.
 * Khi cho phép FILE/BOTH thì fileExtension là whitelist đuôi file được nhận.
 *
 * Phase ④ (admin-challenge-unified-form): Assignment được gấp vào Challenge dạng CODE — kiểu này
 * giờ là thuộc tính của Challenge (CreateChallengeRequest.submissionMethod + gradingConfig), KHÔNG
 * còn entity Assignment riêng. Type giữ lại vì DTO Challenge và form dùng.
 */
export type SubmissionMethod = "GITHUB" | "FILE" | "BOTH";

// ---- Challenge (/api/v1/challenges) ----
export type ChallengeType = "MULTIPLE_CHOICE" | "CODE" | "ESSAY";

/** Hiển thị challenge: COURSE_ONLY = chỉ trong khoá; WORKSPACE_PUBLIC = public lên Workplace. */
export type ChallengeVisibility = "COURSE_ONLY" | "WORKSPACE_PUBLIC";

export interface ChallengeMcqQuestionView {
  id: string;
  question: string;
  options: OptionDto[];
  points: number;
  orderNo: number;
}

export interface ChallengeView {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  type: string;
  mode: string;
  subjectId: string | null;
  lessonId: string | null;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  maxSubmissions: number;
  maxTeamSize: number | null;
  gradingConfig: string | null;
  mcqQuestions: ChallengeMcqQuestionView[] | null;
  // Additive (course-challenge-bank §2): BE GET /challenges có trả courseId + visibility. Cũ bỏ qua;
  // per-lesson editor dùng visibility để render toggle Public<->Workplace ngay trên bài.
  courseId?: string | null;
  visibility?: ChallengeVisibility;
  /**
   * Additive (change challenge-free-flag): challenge cho làm miễn phí (học thử). Học viên trial/
   * chưa mua truy cập được KHI lesson đã FULL-access và free==true. Optional để tương thích
   * response cũ đã cache; absent → coi như false (trả phí, gate như hiện tại).
   */
  free?: boolean;
  /**
   * Additive (admin-challenge-unified-form §④): Challenge CODE có thể là bài NỘP (folded assignment).
   * BE trả submissionMethod (khi type=CODE + là bài nộp) để form Sửa pre-fill đúng radio; absent →
   * không phải bài nộp (test case inline). fileExtension là whitelist đuôi file (chỉ có nghĩa khi
   * FILE/BOTH). Optional để tương thích challenge cũ / response cache.
   */
  submissionMethod?: SubmissionMethod;
  fileExtension?: string | null;
  /**
   * Additive (code-sandbox-assignment §2A/§2C): nội dung .sql seed dataset (BE lộ top-level từ
   * grading_config — VISIBLE cho learner vì là dữ liệu để query, KHÔNG phải đáp án). Admin dùng để
   * pre-fill + diff khi sửa challenge CODE bài NỘP có whitelist .sql. Optional/nullable — response cũ
   * hoặc list view slim (BankChallengeView) không trả field này.
   */
  seedSql?: string | null;
}

export interface CreateChallengeRequest {
  title: string;
  slug: string;
  description?: string;
  type: ChallengeType;
  mode: string; // "INDIVIDUAL"
  subjectId?: string;
  /**
   * Additive (change admin-course-challenge-bank): challenge tạo từ màn Kho set thẳng vào
   * kho course. BE nhận optional trên POST /challenges — chỗ gọi cũ (tab Bài tập lesson)
   * không truyền field này nên hành vi giữ nguyên.
   */
  courseId?: string;
  startsAt: string;
  endsAt: string;
  maxSubmissions: number;
  maxTeamSize?: number;
  scoringConfig?: string;
  rewardConfig?: string;
  /**
   * gradingConfig: chuỗi JSON cấu hình chấm. Với Challenge CODE dạng bài NỘP (admin-challenge-unified-
   * form §④), FE gói rubric của assignment cũ vào đây: {question, expectedOutput, criteria,
   * fileExtension, checkLogic, checkPerform, checkEdgeCase}. BE parse cho AI chấm.
   */
  gradingConfig?: string;
  /**
   * Additive (admin-challenge-unified-form §④): cách nộp bài NỘP cho Challenge CODE (folded
   * assignment). BE nhận optional trên POST /challenges; absent → challenge CODE dùng test case
   * inline (không phải bài nộp). Chỉ set khi type=CODE + tác giả chọn kiểu "bài nộp".
   */
  submissionMethod?: SubmissionMethod;
  /**
   * Additive (change challenge-free-flag): bật cho làm miễn phí (học thử). BE nhận optional trên
   * POST /challenges (default false). Chỗ gọi cũ không truyền → challenge trả phí như hiện tại.
   */
  free?: boolean;
}

/**
 * Sửa 1 challenge đã tạo: PATCH /api/v1/admin/challenges/{id} (AdminChallengeController.update →
 * ChallengeCommandApi.UpdateRequest). PARTIAL — mọi field optional, BE chỉ áp field != null
 * (`if (req.free() != null) c.setFree(...)`); field bỏ trống ⇒ giữ nguyên. Chỉ đính field ĐỔI.
 *
 * LƯU Ý phạm vi: BE UpdateChallengeBody có tham số `difficulty` nhưng service update() KHÔNG đọc nó
 * và ChallengeEntity KHÔNG có cột difficulty (no-op) ⇒ KHÔNG expose ở form để tránh control giả.
 * `type`/`mode` không sửa được qua endpoint này. Nội dung (mcq/test-case/rubric) sửa riêng (follow-up).
 *
 * admin-challenge-unified-form §④: với Challenge CODE dạng bài NỘP, cho sửa nhanh `submissionMethod`
 * + `fileExtension` (whitelist đuôi file). PARTIAL như các field khác — chỉ đính khi ĐỔI.
 *
 * code-sandbox-assignment §2C: `seedSql` (nội dung .sql seed dataset) — flat field, BE merge vào
 * grading_config JSON dưới key "seedSql" (nhất quán với cách merge fileExtension ở đường update).
 * Chỉ có nghĩa khi challenge CODE bài NỘP + whitelist đuôi file chứa .sql. PARTIAL — chỉ đính khi ĐỔI.
 *
 * algo-testcase-starter §3: `starterCode` (map ngôn ngữ→sườn code) — flat field, BE merge vào
 * grading_config JSON dưới key "starterCode" (như seedSql). Chỉ có nghĩa khi challenge CODE
 * (bài thuật toán test-case) — learner-safe (sườn, KHÔNG phải đáp án). PARTIAL — chỉ đính khi ĐỔI.
 */
export interface UpdateChallengeRequest {
  title?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  free?: boolean;
  submissionMethod?: SubmissionMethod;
  fileExtension?: string;
  seedSql?: string;
  starterCode?: Record<string, string>;
}

export interface ChallengeMcqQuestionItem {
  question: string;
  options: OptionDto[];
  correctKeys: string[];
  points?: number;
  orderNo: number;
}

export interface ChallengeTestCaseItem {
  name: string;
  input: string;
  expectedOutput: string;
  weight: number;
  hidden: boolean;
  timeLimitMs: number;
  memoryLimitMb: number;
  orderNo: number;
}

export interface ChallengeRubricItem {
  criterion: string;
  description: string;
  maxScore: number;
  orderNo: number;
}

/**
 * Ràng buộc correctKeys client-side theo type câu hỏi (mirror BE service validate).
 * SINGLE_CHOICE / TRUE_FALSE: đúng 1 key. MULTIPLE_CHOICE: >= 1 key.
 * Trả null nếu hợp lệ, hoặc message lỗi để chặn trước khi bắn request.
 */
export function validateCorrectKeys(
  type: QuizQuestionType,
  correctKeys: string[]
): string | null {
  const count = correctKeys.length;
  if (type === "MULTIPLE_CHOICE") {
    return count >= 1 ? null : "Câu nhiều đáp án cần ít nhất 1 đáp án đúng";
  }
  // SINGLE_CHOICE | TRUE_FALSE
  return count === 1 ? null : "Câu này chỉ được chọn đúng 1 đáp án đúng";
}
