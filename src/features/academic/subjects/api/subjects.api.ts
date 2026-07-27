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

/*
 * Ảnh bìa môn (Contract A). QUAN TRỌNG: `imageUrl` CHỈ được BE lộ (GET) và nhận (PATCH) trên endpoint
 * CORE theo subject CODE — `SubjectCatalogController` /api/v1/subjects/{code}, gated `subject.manage`
 * (global) HOẶC moderator môn. Admin path /admin/subjects/{id} (AdminContentController) KHÔNG mang
 * imageUrl (DTO admin không có field này) nên KHÔNG dùng được cho ảnh bìa. Vì thế đọc/ghi ảnh bìa đi
 * qua coreClient theo CODE — cùng khuôn với prerequisites/staff. BE update chỉ set khi imageUrl != null
 * → XOÁ bìa = gửi chuỗi rỗng "" (không phải null, null bị bỏ qua).
 */

/** Envelope data của GET /subjects/{code} — chỉ dùng imageUrl cho control ảnh bìa. */
interface SubjectCoreDetail {
  imageUrl?: string | null;
}

export function useSubjectCoverImage(code: string | undefined) {
  return useQuery<{ imageUrl: string | null }, Error>({
    queryKey: subjectsKeys.cover(code),
    queryFn: () =>
      coreClient.get(`/subjects/${code}`).then((r) => ({
        imageUrl: (r.data as SubjectCoreDetail).imageUrl ?? null,
      })),
    enabled: !!code,
  });
}

export function useUpdateSubjectCover(subject: { id: string; code: string } | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<{ imageUrl: string | null }, Error, string>({
    // imageUrl="" để xoá bìa (BE set coverImageUrl khi != null; gửi null sẽ bị bỏ qua → không xoá được).
    mutationFn: (imageUrl) =>
      coreClient
        .patch(`/subjects/${subject?.code}`, { imageUrl })
        .then((r) => ({ imageUrl: (r.data as SubjectCoreDetail).imageUrl ?? null })),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: subjectsKeys.cover(subject?.code) });
      queryClientLocal.invalidateQueries({ queryKey: subjectsKeys.detail(subject?.id) });
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

/*
 * Workspace links (khoá liên kết vào workplace của môn). BE WorkspaceController:
 *   GET    /api/v1/subjects/{code}/links           → LinkView[] (public, KHÔNG lọc targetType)
 *   POST   /api/v1/subjects/{code}/links           → LinkView   (gated requireCurate)
 *   DELETE /api/v1/subjects/{code}/links/{id}       → void       (gated requireCurate)
 * Link "khoá gắn môn" mà learn page cần = row target_type='course.course', target_id=courseId,
 * đặt trên tab LEARNING. Endpoint nằm dưới /api/v1/subjects/** (KHÔNG /admin) → coreClient theo CODE
 * (cùng khuôn prerequisites/staff/cover). LinkView.title chỉ là titleOverride (BE không resolve tên
 * khoá) — tab tự resolve tên khoá từ danh sách khoá admin.
 */

/** Tab workspace có thể gắn link (khớp enum BE subject.domain.WorkspaceTab). */
export type WorkspaceTab = "LEARNING" | "RESOURCES" | "PRACTICE" | "AI" | "CAREER";

/** targetType của link khoá gắn môn (learn page lọc đúng chuỗi này). */
export const COURSE_TARGET_TYPE = "course.course";

/** Envelope data của GET /subjects/{code}/links (SubjectDtos.LinkView). */
export interface WorkspaceLinkView {
  id: string;
  tab: WorkspaceTab;
  targetType: string;
  targetId: string;
  /** = titleOverride của link (thường null cho link khoá) — KHÔNG phải tên khoá đã resolve. */
  title: string | null;
  sortOrder: number;
  pinned: boolean;
}

/** Body POST /subjects/{code}/links (SubjectDtos.CreateLinkRequest) — chỉ mang field bắt buộc. */
export interface CreateWorkspaceLinkRequest {
  tab: WorkspaceTab;
  targetType: string;
  targetId: string;
}

export function useSubjectLinks(code: string | undefined) {
  return useQuery<WorkspaceLinkView[], Error>({
    queryKey: subjectsKeys.links(code),
    queryFn: () =>
      coreClient.get(`/subjects/${code}/links`).then((r) => r.data as WorkspaceLinkView[]),
    enabled: !!code,
  });
}

export function useCreateSubjectLink(subject: { code: string } | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<WorkspaceLinkView, Error, { courseId: string }>({
    mutationFn: ({ courseId }) =>
      coreClient
        .post(`/subjects/${subject?.code}/links`, {
          tab: "LEARNING",
          targetType: COURSE_TARGET_TYPE,
          targetId: courseId,
        } satisfies CreateWorkspaceLinkRequest)
        .then((r) => r.data as WorkspaceLinkView),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: subjectsKeys.links(subject?.code) });
    },
    onError: handleAdminMutationError,
  });
}

export function useDeleteSubjectLink(subject: { code: string } | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<void, Error, { linkId: string }>({
    mutationFn: ({ linkId }) =>
      coreClient.delete(`/subjects/${subject?.code}/links/${linkId}`).then(() => undefined),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: subjectsKeys.links(subject?.code) });
    },
    onError: handleAdminMutationError,
  });
}
