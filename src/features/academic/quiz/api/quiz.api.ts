import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../../shared/api/client";
import type {
  PaginatedResponse,
  QuizBulkImportResult,
  QuizFormValues,
  QuizListParams,
  QuizQuestion,
  QuizQuestionWriteRequest,
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

/*
 * WRITE — AdminQuizQuestionController (gate course.manage GLOBAL, khớp <Can> ở UI):
 *   POST   /quiz-questions              tạo (body options+correctKeys, KHÔNG phải answers)
 *   PATCH  /quiz-questions/{id}         partial: field vắng = giữ nguyên; 409 COURSE_STATE_INVALID
 *                                       khi sửa content/type/options/correctKeys/points của câu hỏi
 *                                       gắn quiz đã có attempt (metadata vẫn sửa được)
 *   DELETE /quiz-questions/{id}         SOFT-delete: status → 'archived' (idempotent)
 *   POST   /quiz-questions/bulk-import  body = MẢNG create request; partial-success per-index
 *
 * FE form/list dùng shape answers[{id,text,isCorrect}] (khớp response view) — helpers dưới map
 * sang options/correctKeys của request.
 */

/** Map answers (shape hiển thị/form) → options + correctKeys của request BE. */
function toOptionFields(values: QuizFormValues): Pick<QuizQuestionWriteRequest, "options" | "correctKeys"> {
  const pairs = values.answers.map((a, i) => ({
    key: a.id?.trim() ? a.id.trim() : String(i + 1),
    text: a.text,
    isCorrect: a.isCorrect,
  }));
  return {
    options: pairs.map(({ key, text }) => ({ key, text })),
    correctKeys: pairs.filter((p) => p.isCorrect).map((p) => p.key),
  };
}

export function toCreateQuizQuestionRequest(values: QuizFormValues): QuizQuestionWriteRequest {
  return {
    content: values.content,
    type: values.type,
    ...toOptionFields(values),
    // subjectId: BE nhận null/'' = chưa gắn môn; UUID rác → 400.
    subjectId: values.subjectId || "",
    tags: values.tags ?? [],
    difficulty: values.difficulty,
    status: values.status,
  };
}

/**
 * PATCH diff-based: chỉ gửi content/type/options/correctKeys khi THẬT SỰ đổi — tránh 409
 * COURSE_STATE_INVALID oan khi chỉ sửa metadata của câu hỏi gắn quiz đã có attempt.
 */
export function toUpdateQuizQuestionRequest(
  original: QuizQuestion,
  values: QuizFormValues
): QuizQuestionWriteRequest {
  const req: QuizQuestionWriteRequest = {
    // Metadata luôn PATCH được: subjectId '' = gỡ môn, uuid = gán môn.
    subjectId: values.subjectId || "",
    tags: values.tags ?? [],
    difficulty: values.difficulty,
    status: values.status,
  };

  if (values.content !== original.content) {
    req.content = values.content;
  }

  const { options, correctKeys } = toOptionFields(values);
  const originalOptions = original.answers.map((a) => ({ key: a.id, text: a.text }));
  const originalCorrect = original.answers.filter((a) => a.isCorrect).map((a) => a.id);
  const sameOptions = JSON.stringify(options) === JSON.stringify(originalOptions);
  const sameCorrect = JSON.stringify([...(correctKeys ?? [])].sort()) === JSON.stringify([...originalCorrect].sort());
  if (!sameOptions || !sameCorrect) {
    req.options = options;
    req.correctKeys = correctKeys;
    // View GET không trả type → chỉ gửi type kèm khi đổi cấu trúc đáp án (server revalidate tổ hợp).
    req.type = values.type;
  }

  return req;
}

export function useCreateQuizQuestion() {
  const queryClientLocal = useQueryClient();
  return useMutation<QuizQuestion, Error, QuizFormValues>({
    mutationFn: (values) =>
      apiClient
        .post("/quiz-questions", toCreateQuizQuestionRequest(values))
        .then((r) => r.data as QuizQuestion),
    onSuccess: () => queryClientLocal.invalidateQueries({ queryKey: quizKeys.lists() }),
  });
}

export function useUpdateQuizQuestion(original: QuizQuestion | null) {
  const queryClientLocal = useQueryClient();
  return useMutation<QuizQuestion, Error, QuizFormValues>({
    mutationFn: (values) => {
      if (!original) return Promise.reject(new Error("Chưa chọn câu hỏi để sửa"));
      return apiClient
        .patch(`/quiz-questions/${original.id}`, toUpdateQuizQuestionRequest(original, values))
        .then((r) => r.data as QuizQuestion);
    },
    onSuccess: () => queryClientLocal.invalidateQueries({ queryKey: quizKeys.lists() }),
  });
}

export function useDeleteQuizQuestion() {
  const queryClientLocal = useQueryClient();
  return useMutation<void, Error, string>({
    // SOFT-delete: BE chuyển status → 'archived' (list mặc định vẫn thấy row với tag archived).
    mutationFn: (questionId) => apiClient.delete(`/quiz-questions/${questionId}`).then(() => undefined),
    onSuccess: () => queryClientLocal.invalidateQueries({ queryKey: quizKeys.lists() }),
  });
}

export function useImportQuizQuestions() {
  const queryClientLocal = useQueryClient();
  return useMutation<QuizBulkImportResult, Error, unknown[]>({
    // Body = MẢNG JSON thuần các create request; BE validate từng dòng (partial-success).
    mutationFn: (questions) =>
      apiClient
        .post("/quiz-questions/bulk-import", questions)
        .then((r) => r.data as QuizBulkImportResult),
    onSuccess: () => queryClientLocal.invalidateQueries({ queryKey: quizKeys.lists() }),
  });
}
