import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coreClient } from "../../../../shared/api/client";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import { exerciseKeys } from "./exercises.keys";
import type {
  AssignmentView,
  ChallengeMcqQuestionItem,
  ChallengeRubricItem,
  ChallengeTestCaseItem,
  ChallengeView,
  ChallengeVisibility,
  CreateAssignmentRequest,
  CreateChallengeRequest,
  CreateQuestionRequest,
  CreateQuizRequest,
  QuizSummaryView,
  UpdateAssignmentRequest,
} from "../types";

interface IdResponse {
  id: string;
}

// ------------------------------------------------------------------ quiz
export function useLessonQuizzes(lessonId: string | undefined) {
  return useQuery<QuizSummaryView[], Error>({
    queryKey: exerciseKeys.quizzes(lessonId),
    enabled: Boolean(lessonId),
    queryFn: () =>
      coreClient
        .get(`/courses/lessons/${lessonId}/quizzes`, {
          params: { includeDrafts: true },
        })
        .then((r) => r.data as QuizSummaryView[]),
  });
}

export function useCreateQuiz(lessonId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<IdResponse, Error, CreateQuizRequest>({
    mutationFn: (body) =>
      coreClient
        .post(`/courses/lessons/${lessonId}/quizzes`, body)
        .then((r) => r.data as IdResponse),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: exerciseKeys.quizzes(lessonId) });
    },
    onError: handleAdminMutationError,
  });
}

export function useAddQuizQuestion(lessonId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<IdResponse, Error, { quizId: string; body: CreateQuestionRequest }>({
    mutationFn: ({ quizId, body }) =>
      coreClient
        .post(`/courses/quizzes/${quizId}/questions`, body)
        .then((r) => r.data as IdResponse),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: exerciseKeys.quizzes(lessonId) });
    },
    onError: handleAdminMutationError,
  });
}

export function useDeleteQuizQuestion(lessonId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<void, Error, { questionId: string }>({
    mutationFn: ({ questionId }) =>
      coreClient.delete(`/courses/questions/${questionId}`).then(() => undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: exerciseKeys.quizzes(lessonId) });
    },
    onError: handleAdminMutationError,
  });
}

export function usePublishQuiz(lessonId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<void, Error, { quizId: string }>({
    mutationFn: ({ quizId }) =>
      coreClient.post(`/courses/quizzes/${quizId}/publish`).then(() => undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: exerciseKeys.quizzes(lessonId) });
    },
    onError: handleAdminMutationError,
  });
}

export function useUnpublishQuiz(lessonId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<void, Error, { quizId: string }>({
    mutationFn: ({ quizId }) =>
      coreClient.post(`/courses/quizzes/${quizId}/unpublish`).then(() => undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: exerciseKeys.quizzes(lessonId) });
    },
    onError: handleAdminMutationError,
  });
}

export function useArchiveQuiz(lessonId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<void, Error, { quizId: string }>({
    mutationFn: ({ quizId }) =>
      coreClient.delete(`/courses/quizzes/${quizId}`).then(() => undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: exerciseKeys.quizzes(lessonId) });
    },
    onError: handleAdminMutationError,
  });
}

// ------------------------------------------------------------- assignment
export function useLessonAssignments(lessonId: string | undefined) {
  return useQuery<AssignmentView[], Error>({
    queryKey: exerciseKeys.assignments(lessonId),
    enabled: Boolean(lessonId),
    queryFn: () =>
      coreClient
        .get(`/courses/lessons/${lessonId}/assignments`)
        .then((r) => r.data as AssignmentView[]),
  });
}

export function useCreateAssignment(lessonId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<IdResponse, Error, CreateAssignmentRequest>({
    mutationFn: (body) =>
      coreClient
        .post(`/courses/lessons/${lessonId}/assignments`, body)
        .then((r) => r.data as IdResponse),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: exerciseKeys.assignments(lessonId) });
    },
    onError: handleAdminMutationError,
  });
}

// PUT /courses/lessons/{lessonId}/assignments/{assignmentId} — sửa toàn phần (UpdateAssignmentRequest
// mirror CreateAssignmentRequest; lessonId KHÔNG đổi). Ownership-scoped ở service.
export function useUpdateAssignment(lessonId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<IdResponse, Error, { assignmentId: string; body: UpdateAssignmentRequest }>({
    mutationFn: ({ assignmentId, body }) =>
      coreClient
        .put(`/courses/lessons/${lessonId}/assignments/${assignmentId}`, body)
        .then((r) => r.data as IdResponse),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: exerciseKeys.assignments(lessonId) });
    },
    onError: handleAdminMutationError,
  });
}

// DELETE /courses/lessons/{lessonId}/assignments/{assignmentId}. Ownership-scoped ở service.
export function useDeleteAssignment(lessonId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<void, Error, { assignmentId: string }>({
    mutationFn: ({ assignmentId }) =>
      coreClient
        .delete(`/courses/lessons/${lessonId}/assignments/${assignmentId}`)
        .then(() => undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: exerciseKeys.assignments(lessonId) });
    },
    onError: handleAdminMutationError,
  });
}

// -------------------------------------------------------------- challenge
// GET /challenges trả toàn bộ — filter client-side theo lessonId (ChallengeView.lessonId).
export function useLessonChallenges(lessonId: string | undefined, enabled = true) {
  return useQuery<ChallengeView[], Error>({
    queryKey: exerciseKeys.challenges(),
    enabled,
    queryFn: () =>
      coreClient.get(`/challenges`).then((r) => r.data as ChallengeView[]),
    select: (all) => all.filter((c) => c.lessonId === lessonId),
  });
}

/**
 * Thử thách CHƯA GẮN bài của 1 khoá (kho): GET /admin/challenges?courseId= trả MỌI status kể cả
 * DRAFT và challenge lessonId=null. Đây là lưới an toàn sau khi gỡ tab "Kho thử thách": wizard tạo
 * challenge (POST) trước rồi mới gắn (PUT lesson) — nếu người dùng đóng giữa chừng hoặc gắn bị 409
 * thì challenge mồ côi (lessonId=null) chỉ còn thấy ở đây (GET /challenges công khai lọc mất DRAFT).
 * Lọc client-side lessonId==null để chỉ hiện đám mồ côi.
 */
export function useCourseUnattachedChallenges(courseId: string | undefined, enabled = true) {
  return useQuery<ChallengeView[], Error>({
    queryKey: exerciseKeys.courseChallenges(courseId),
    enabled: enabled && Boolean(courseId),
    queryFn: () =>
      coreClient
        .get(`/admin/challenges`, { params: { courseId } })
        .then((r) => r.data as ChallengeView[]),
    select: (all) => all.filter((c) => c.lessonId == null),
  });
}

export function useCreateChallenge() {
  const qc = useQueryClient();
  return useMutation<ChallengeView, Error, CreateChallengeRequest>({
    mutationFn: (body) =>
      coreClient.post(`/challenges`, body).then((r) => r.data as ChallengeView),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: exerciseKeys.challenges() });
    },
    // KHÔNG auto-notify: wizard tự hiển thị lỗi inline theo bước.
  });
}

export function useUpsertChallengeMcq() {
  return useMutation<void, Error, { id: string; questions: ChallengeMcqQuestionItem[] }>({
    mutationFn: ({ id, questions }) =>
      coreClient.put(`/challenges/${id}/mcq-questions`, { questions }).then(() => undefined),
  });
}

export function useUpsertChallengeTestCases() {
  return useMutation<void, Error, { id: string; testCases: ChallengeTestCaseItem[] }>({
    mutationFn: ({ id, testCases }) =>
      coreClient.put(`/challenges/${id}/test-cases`, { testCases }).then(() => undefined),
  });
}

export function useUpsertChallengeRubrics() {
  return useMutation<void, Error, { id: string; rubrics: ChallengeRubricItem[] }>({
    mutationFn: ({ id, rubrics }) =>
      coreClient.put(`/challenges/${id}/rubrics`, { rubrics }).then(() => undefined),
  });
}

// PUT /challenges/{id}/lesson — 409 CHALLENGE_LESSON_ALREADY_ATTACHED khi lesson đã có
// challenge active khác (uq_challenge_lesson_active). Component catch để hiện đích danh.
export function useLinkChallengeLesson() {
  const qc = useQueryClient();
  return useMutation<ChallengeView, Error, { id: string; lessonId: string }>({
    mutationFn: ({ id, lessonId }) =>
      coreClient
        .put(`/challenges/${id}/lesson`, { lessonId })
        .then((r) => r.data as ChallengeView),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: exerciseKeys.challenges() });
      // Gắn bài xong thì challenge rời "kho mồ côi" → làm mới danh sách chưa-gắn của mọi khoá.
      qc.invalidateQueries({ queryKey: [...exerciseKeys.all, "course-challenges"] });
    },
  });
}

export function usePublishChallenge() {
  const qc = useQueryClient();
  return useMutation<ChallengeView, Error, { id: string }>({
    mutationFn: ({ id }) =>
      coreClient.post(`/challenges/${id}/publish`).then((r) => r.data as ChallengeView),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: exerciseKeys.challenges() });
      qc.invalidateQueries({ queryKey: [...exerciseKeys.all, "course-challenges"] });
    },
  });
}

/**
 * Đổi visibility 1 challenge: POST /admin/challenges/{id}/visibility { visibility }.
 * (course-editor-slimming) Relocate từ challenge-bank sang exercises: toggle Public<->Workplace nay
 * nằm trên per-lesson exercise card. Sau thành công invalidate danh sách challenge để hàng refresh.
 * Lỗi BE (vd CHALLENGE_INVALID_STATE) map qua handleAdminMutationError.
 */
export function useSetChallengeVisibility() {
  const qc = useQueryClient();
  return useMutation<ChallengeView, Error, { id: string; visibility: ChallengeVisibility }>({
    mutationFn: ({ id, visibility }) =>
      coreClient
        .post(`/admin/challenges/${id}/visibility`, { visibility })
        .then((r) => r.data as ChallengeView),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: exerciseKeys.challenges() });
      qc.invalidateQueries({ queryKey: [...exerciseKeys.all, "course-challenges"] });
    },
    onError: handleAdminMutationError,
  });
}
