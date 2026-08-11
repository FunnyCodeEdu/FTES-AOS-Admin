export const exerciseKeys = {
  all: ["admin", "exercises"] as const,
  quizzes: (lessonId: string | undefined) =>
    [...exerciseKeys.all, "quizzes", lessonId] as const,
  challenges: () => [...exerciseKeys.all, "challenges"] as const,
  courseChallenges: (courseId: string | undefined) =>
    [...exerciseKeys.all, "course-challenges", courseId] as const,
  /** Challenge của MỘT bài học (GET /admin/challenges/by-lesson) — mọi status/visibility. */
  lessonChallenges: (lessonId: string | undefined) =>
    [...exerciseKeys.all, "lesson-challenges", lessonId] as const,
  /**
   * challenge-testcase-editor §2: test case ĐÃ LƯU của 1 challenge
   * (GET /admin/challenges/{id}/test-cases). Tách khỏi key challenge để PUT/import chỉ invalidate
   * đúng danh sách case, không quét lại toàn bộ kho challenge.
   */
  testCases: (challengeId: string | undefined) =>
    [...exerciseKeys.all, "test-cases", challengeId] as const,
};
