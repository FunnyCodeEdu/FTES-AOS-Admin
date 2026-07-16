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

// GET /courses/lessons/{id}/assignments
export interface AssignmentView {
  id: string;
  lessonId: string;
  title: string;
  question: string;
  criteria: string | null;
  fileExtension: string | null;
  maxSubmissions: number;
  free: boolean;
  sortOrder: number;
}

export interface CreateAssignmentRequest {
  title: string;
  question: string;
  expectedOutput?: string;
  criteria?: string;
  checkLogic: boolean;
  checkPerform: boolean;
  checkEdgeCase: boolean;
  fileExtension?: string;
  sortOrder: number;
  maxSubmissions?: number;
  free: boolean;
  testCases?: string;
}

// ---- Challenge (/api/v1/challenges) ----
export type ChallengeType = "MULTIPLE_CHOICE" | "CODE" | "ESSAY";

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
  gradingConfig?: string;
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
