import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../../shared/api/client";
import { graphqlRequest } from "../../../../shared/api/graphql";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import type {
  PaginatedResponse,
  Subject,
  SubjectDetail,
  SubjectFormValues,
  SubjectListParams,
} from "../../types";
import { subjectsKeys } from "./subjects.keys";

const ADMIN_SUBJECTS_QUERY = `query AdminSubjects($filter: AdminSubjectFilter, $page: PageInput) {
  adminSubjects(filter: $filter, page: $page) {
    items {
      id
      code
      name
      status
    }
    total
    page
    size
  }
}`;

export function useSubjects(params: SubjectListParams) {
  return useQuery<PaginatedResponse<Subject>, Error>({
    queryKey: subjectsKeys.list(params),
    queryFn: () =>
      graphqlRequest<{
        adminSubjects: {
          items: Array<{ id: string; code: string; name: string; status: string }>;
          total: number;
          page: number;
          size: number;
        };
      }>(ADMIN_SUBJECTS_QUERY, {
        filter: {
          ...(params.search ? { q: params.search } : {}),
          ...(params.status ? { status: params.status } : {}),
        },
        page: { page: Math.max(0, params.page - 1), size: params.pageSize },
      }).then((r) => {
        const now = new Date().toISOString();
        return {
          items: r.adminSubjects.items.map((item) => ({
            id: item.id,
            code: item.code,
            name: item.name,
            description: "",
            status: item.status as Subject["status"],
            lecturerIds: [],
            moderatorIds: [],
            createdAt: now,
            updatedAt: now,
          })),
          total: r.adminSubjects.total,
          page: (r.adminSubjects.page ?? 0) + 1,
          pageSize: r.adminSubjects.size,
        };
      }),
    placeholderData: (previous) => previous,
  });
}

export function useSubject(id: string | undefined) {
  return useQuery<SubjectDetail, Error>({
    queryKey: subjectsKeys.detail(id),
    queryFn: () => apiClient.get(`/subjects/${id}`).then((r) => r.data as SubjectDetail),
    enabled: !!id,
  });
}

export function useCreateSubject() {
  const queryClientLocal = useQueryClient();
  return useMutation<Subject, Error, SubjectFormValues>({
    mutationFn: (values) =>
      apiClient.post("/subjects", values).then((r) => r.data as Subject),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: subjectsKeys.lists() });
    },
  });
}

export function useUpdateSubject(id: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<SubjectDetail, Error, SubjectFormValues>({
    mutationFn: (values) =>
      apiClient.put(`/subjects/${id}`, values).then((r) => r.data as SubjectDetail),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: subjectsKeys.detail(id) });
      queryClientLocal.invalidateQueries({ queryKey: subjectsKeys.lists() });
    },
  });
}

export function useDeleteSubject() {
  const queryClientLocal = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (subjectId) => apiClient.delete(`/subjects/${subjectId}`).then(() => undefined),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: subjectsKeys.lists() });
    },
    onError: handleAdminMutationError,
  });
}

export function useUpdatePrerequisites(id: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<SubjectDetail, Error, { subjectIds: string[] }>({
    mutationFn: (values) =>
      apiClient
        .put(`/subjects/${id}/prerequisites`, values)
        .then((r) => r.data as SubjectDetail),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: subjectsKeys.detail(id) });
    },
    onError: handleAdminMutationError,
  });
}

export function useUpdateStaff(id: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<SubjectDetail, Error, { lecturerIds: string[]; moderatorIds: string[] }>({
    mutationFn: (values) =>
      apiClient.put(`/subjects/${id}/staff`, values).then((r) => r.data as SubjectDetail),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: subjectsKeys.detail(id) });
    },
    onError: handleAdminMutationError,
  });
}
