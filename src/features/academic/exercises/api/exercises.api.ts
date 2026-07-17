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
  CreateAssignmentRequest,
  CreateChallengeRequest,
  CreateQuestionRequest,
  CreateQuizRequest,
  QuizSummaryView,
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
    },
  });
}
