import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../../shared/api/client";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import type {
  AddCourseRequest,
  CreateTermRequest,
  TermAffectedSummaryView,
  TermCourseView,
  TermView,
  UpdateTermRequest,
} from "../../types";
import { termsKeys } from "./terms.keys";

/**
 * Kỳ học (term). Tất cả endpoint nằm dưới `/api/v1/admin/terms**` → dùng `apiClient` (base
 * `/api/v1/admin`). Envelope `{code,message,data}` được interceptor bóc sẵn → dùng `res.data`.
 * Ghi gate BE `term.manage`, đọc `term.view`. Mutation: `onError: handleAdminMutationError`
 * (bản địa hoá mã TERM_*) + invalidate đúng query-key.
 */

export function useTerms() {
  return useQuery<TermView[], Error>({
    queryKey: termsKeys.list(),
    queryFn: () => apiClient.get("/terms").then((r) => r.data as TermView[]),
  });
}

export function useTerm(id: string | undefined) {
  return useQuery<TermView, Error>({
    queryKey: termsKeys.detail(id),
    queryFn: () => apiClient.get(`/terms/${id}`).then((r) => r.data as TermView),
    enabled: !!id,
  });
}

export function useCreateTerm() {
  const queryClientLocal = useQueryClient();
  return useMutation<TermView, Error, CreateTermRequest>({
    mutationFn: (body) => apiClient.post("/terms", body).then((r) => r.data as TermView),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: termsKeys.lists() });
    },
    onError: handleAdminMutationError,
  });
}

export function useUpdateTerm(id: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<TermView, Error, UpdateTermRequest>({
    mutationFn: (body) => apiClient.put(`/terms/${id}`, body).then((r) => r.data as TermView),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: termsKeys.detail(id) });
      queryClientLocal.invalidateQueries({ queryKey: termsKeys.lists() });
    },
    onError: handleAdminMutationError,
  });
}

export function useDeleteTerm() {
  const queryClientLocal = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (termId) => apiClient.delete(`/terms/${termId}`).then(() => undefined),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: termsKeys.lists() });
    },
    onError: handleAdminMutationError,
  });
}

export function useTermCourses(id: string | undefined) {
  return useQuery<TermCourseView[], Error>({
    queryKey: termsKeys.courses(id),
    queryFn: () => apiClient.get(`/terms/${id}/courses`).then((r) => r.data as TermCourseView[]),
    enabled: !!id,
  });
}

/** Sau add/remove khoá: courseCount đổi (detail + list) và tóm tắt ảnh hưởng đổi → invalidate cả 4. */
function invalidateTermCourseGraph(
  queryClientLocal: ReturnType<typeof useQueryClient>,
  id: string | undefined
) {
  queryClientLocal.invalidateQueries({ queryKey: termsKeys.courses(id) });
  queryClientLocal.invalidateQueries({ queryKey: termsKeys.enrollments(id) });
  queryClientLocal.invalidateQueries({ queryKey: termsKeys.detail(id) });
  queryClientLocal.invalidateQueries({ queryKey: termsKeys.lists() });
}

export function useAddTermCourse(id: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<void, Error, AddCourseRequest>({
    mutationFn: (body) => apiClient.post(`/terms/${id}/courses`, body).then(() => undefined),
    onSuccess: () => invalidateTermCourseGraph(queryClientLocal, id),
    onError: handleAdminMutationError,
  });
}

export function useRemoveTermCourse(id: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (courseId) =>
      apiClient.delete(`/terms/${id}/courses/${courseId}`).then(() => undefined),
    onSuccess: () => invalidateTermCourseGraph(queryClientLocal, id),
    onError: handleAdminMutationError,
  });
}

export function useTermAffected(id: string | undefined) {
  return useQuery<TermAffectedSummaryView, Error>({
    queryKey: termsKeys.enrollments(id),
    queryFn: () =>
      apiClient.get(`/terms/${id}/enrollments`).then((r) => r.data as TermAffectedSummaryView),
    enabled: !!id,
  });
}
