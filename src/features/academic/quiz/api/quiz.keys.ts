import type { QuizListParams } from "../../types";

export const quizKeys = {
  all: ["admin", "quiz"] as const,
  lists: () => [...quizKeys.all, "list"] as const,
  list: (params: QuizListParams) => [...quizKeys.lists(), params] as const,
};
