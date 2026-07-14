import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../../shared/api/client";
import type {
  PaginatedResponse,
  QuizFormValues,
  QuizImportJob,
  QuizListParams,
  QuizQuestion,
} from "../../types";
import { quizKeys } from "./quiz.keys";

export function useQuizQuestions(params: QuizListParams) {
  return useQuery<PaginatedResponse<QuizQuestion>, Error>({
    queryKey: quizKeys.list(params),
    queryFn: () =>
      apiClient.get("/quiz-questions", { params }).then((r) => r.data as PaginatedResponse<QuizQuestion>),
    placeholderData: (previous) => previous,
  });
}

/**
 * BE hiện CHỈ có GET /api/v1/admin/quiz-questions (AdminQuizQuestionController) — không có
 * POST/PUT/DELETE/import. Mutation quiz duy nhất phía BE là creator-flow theo quiz của lesson
 * (AssessmentController /api/v1/courses/quizzes/{quizId}/questions), không khớp bank admin.
 * Các hook mutation dưới đây GIỮ NGUYÊN chờ BE bổ sung; UI đang disable nút ghi
 * (QuizBankPage/QuizTable) để không gọi 404/405.
 */
export const QUIZ_WRITE_UNSUPPORTED_HINT =
  "BE chưa hỗ trợ — chưa có endpoint ghi ngân hàng câu hỏi";

export function useCreateQuizQuestion() {
  const queryClientLocal = useQueryClient();
  return useMutation<QuizQuestion, Error, QuizFormValues>({
    mutationFn: (values) =>
      apiClient.post("/quiz-questions", values).then((r) => r.data as QuizQuestion),
    onSuccess: () => queryClientLocal.invalidateQueries({ queryKey: quizKeys.lists() }),
  });
}

export function useUpdateQuizQuestion(id: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<QuizQuestion, Error, QuizFormValues>({
    mutationFn: (values) =>
      apiClient.put(`/quiz-questions/${id}`, values).then((r) => r.data as QuizQuestion),
    onSuccess: () => queryClientLocal.invalidateQueries({ queryKey: quizKeys.lists() }),
  });
}

export function useDeleteQuizQuestion() {
  const queryClientLocal = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (questionId) => apiClient.delete(`/quiz-questions/${questionId}`).then(() => undefined),
    onSuccess: () => queryClientLocal.invalidateQueries({ queryKey: quizKeys.lists() }),
  });
}

export function useImportQuizQuestions() {
  const queryClientLocal = useQueryClient();
  return useMutation<{ jobId: string }, Error, FormData>({
    mutationFn: (formData) =>
      apiClient
        .post("/quiz-questions/import", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data as { jobId: string }),
    onSuccess: () => queryClientLocal.invalidateQueries({ queryKey: quizKeys.lists() }),
  });
}

export function useImportJob(jobId: string | undefined) {
  return useQuery<QuizImportJob, Error>({
    queryKey: quizKeys.import(jobId),
    queryFn: () => apiClient.get(`/quiz-questions/import/${jobId}`).then((r) => r.data as QuizImportJob),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "processing" ? 2000 : false;
    },
  });
}
