export const exerciseKeys = {
  all: ["admin", "exercises"] as const,
  quizzes: (lessonId: string | undefined) =>
    [...exerciseKeys.all, "quizzes", lessonId] as const,
  assignments: (lessonId: string | undefined) =>
    [...exerciseKeys.all, "assignments", lessonId] as const,
  challenges: () => [...exerciseKeys.all, "challenges"] as const,
};
