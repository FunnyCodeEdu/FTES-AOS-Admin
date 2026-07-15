import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, coreClient } from "../../../../shared/api/client";
import { graphqlRequest, toGraphQLSortOrder } from "../../../../shared/api/graphql";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import type {
  PaginatedResponse,
  Subject,
  SubjectDetail,
  SubjectFormValues,
  SubjectListParams,
  SubjectStaffRole,
  SubjectStaffView,
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
          ...(params.sortBy ? { sortBy: params.sortBy } : {}),
          ...(toGraphQLSortOrder(params.sortOrder)
            ? { sortOrder: toGraphQLSortOrder(params.sortOrder) }
            : {}),
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
      // BE là @PatchMapping /admin/subjects/{id} (AdminContentController) — PUT trả 405.
      apiClient.patch(`/subjects/${id}`, values).then((r) => r.data as SubjectDetail),
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

/**
 * Prerequisites: BE có PUT /api/v1/subjects/{code}/prerequisites (SubjectCatalogController,
 * authz subject.manage), key theo subject CODE, body {prerequisites: [{subjectId, kind?}]} —
 * hook dưới gọi qua coreClient (base /api/v1).
 */

/** Envelope data của PUT /subjects/{code}/prerequisites (SubjectDtos.PrerequisiteView). */
export interface PrerequisiteView {
  subjectId: string;
  code: string;
  name: string;
  kind: "MANDATORY" | "RECOMMENDED";
}

export function useUpdatePrerequisites(subject: { id: string; code: string } | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<PrerequisiteView[], Error, { subjectIds: string[] }>({
    // Kind không chọn được trên UI (multi-select phẳng) → gửi thiếu kind, BE default MANDATORY.
    mutationFn: (values) =>
      coreClient
        .put(`/subjects/${subject?.code}/prerequisites`, {
          prerequisites: values.subjectIds.map((subjectId) => ({ subjectId })),
        })
        .then((r) => r.data as PrerequisiteView[]),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: subjectsKeys.detail(subject?.id) });
    },
  });
}

/*
 * Staff: BE SubjectStaffController (authz subject.manage — khớp <Can permissions={["subject.manage"]}>):
 *   GET /api/v1/subjects/{code}/staff  → StaffView[] (membership role != STUDENT, kèm profile/email)
 *   PUT /api/v1/subjects/{code}/staff  → replace-semantics: body {staff:[{userId, role}]} là trạng
 *       thái CUỐI; staff vắng mặt bị hạ về STUDENT (không kick khỏi môn). Role CHỈ nhận
 *       MODERATOR|LECTURER|CONTRIBUTOR (không có MANAGER per-subject — đó là RBAC global).
 * Key theo subject CODE (không phải /admin/subjects/{id}/staff) — gọi qua coreClient.
 */

export function useSubjectStaff(code: string | undefined) {
  return useQuery<SubjectStaffView[], Error>({
    queryKey: subjectsKeys.staff(code),
    queryFn: () => coreClient.get(`/subjects/${code}/staff`).then((r) => r.data as SubjectStaffView[]),
    enabled: !!code,
  });
}

export function useReplaceSubjectStaff(subject: { id: string; code: string } | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<SubjectStaffView[], Error, { userId: string; role: SubjectStaffRole }[]>({
    mutationFn: (staff) =>
      coreClient
        .put(`/subjects/${subject?.code}/staff`, { staff })
        .then((r) => r.data as SubjectStaffView[]),
    onSuccess: (staffAfter) => {
      // PUT trả danh sách staff SAU replace (cùng shape GET) — set thẳng cache, khỏi refetch.
      queryClientLocal.setQueryData(subjectsKeys.staff(subject?.code), staffAfter);
      queryClientLocal.invalidateQueries({ queryKey: subjectsKeys.detail(subject?.id) });
    },
    onError: handleAdminMutationError,
  });
}
