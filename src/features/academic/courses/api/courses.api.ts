import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, coreClient } from "../../../../shared/api/client";
import { graphqlRequest, toGraphQLSortOrder } from "../../../../shared/api/graphql";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import type {
  Course,
  CourseDetail,
  CourseFormValues,
  CourseListParams,
  CoursePackage,
  CourseStatus,
  CourseTreeNode,
  CourseType,
  CreateEntitlementRequest,
  CreatePackageRequest,
  PackageEntitlement,
  PaginatedResponse,
  UpdatePackageRequest,
} from "../../types";
import type { LessonType } from "../../lessons/types";
import { coursesKeys } from "./courses.keys";

const ADMIN_COURSE_QUERY = `query AdminCourse($id: ID!) {
  adminCourse(id: $id) {
    id
    title
    slugName
    status
    saleMode
    sections {
      id
      name
      description
      sortOrder
      lessons {
        id
        name
        description
        type
        sortOrder
        free
        videoStatus
      }
    }
  }
}`;

interface AdminCourseGql {
  id: string;
  title: string;
  slugName: string;
  status: string;
  saleMode?: string | null;
  sections: Array<{
    id: string;
    name: string;
    description?: string | null;
    sortOrder: number;
    lessons: Array<{
      id: string;
      name: string;
      description?: string | null;
      type: string;
      sortOrder: number;
      free: boolean;
    }>;
  }>;
}

/** BE course status (UPPERCASE) → FE CourseStatus (lowercase). */
function mapCourseStatus(status: string): CourseStatus {
  switch (status) {
    case "PUBLISHED":
      return "published";
    case "ARCHIVED":
      return "archived";
    case "REVIEW":
      return "review";
    default:
      return "draft";
  }
}

/** adminCourse(id) → CourseDetail; node dùng BE id làm key (node đã tồn tại). */
function mapAdminCourseToDetail(c: AdminCourseGql): CourseDetail {
  const tree: CourseTreeNode[] = c.sections.map((section) => ({
    id: section.id,
    key: section.id,
    title: section.name,
    description: section.description,
    type: "section",
    children: section.lessons.map((lesson) => ({
      id: lesson.id,
      key: lesson.id,
      title: lesson.name,
      description: lesson.description,
      type: "lesson",
      lessonType: lesson.type as LessonType,
    })),
  }));
  const now = new Date().toISOString();
  const status = mapCourseStatus(c.status);
  return {
    id: c.id,
    subjectId: "",
    subjectName: "",
    name: c.title,
    summary: "",
    status,
    workflowStatus: status,
    lecturerIds: [],
    basePrice: undefined,
    saleMode: (c.saleMode as CourseType) ?? undefined,
    createdAt: now,
    updatedAt: now,
    tree,
    publishChecklist: [],
  };
}

const ADMIN_COURSES_QUERY = `query AdminCourses($filter: AdminCourseFilter, $page: PageInput) {
  adminCourses(filter: $filter, page: $page) {
    items {
      id
      title
      status
      saleMode
    }
    total
    page
    size
  }
}`;

/** Hình dạng `input AdminCourseFilter` của GraphQL BE (schema.graphqls). */
export interface AdminCourseFilterInput {
  q?: string;
  subjectId?: string;
  status?: string;
  type?: CourseType;
  lecturerId?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

/**
 * Params URL của trang danh sách → `AdminCourseFilter`. Chỉ mang field có giá trị (BE coi thiếu
 * field = không lọc). Đổi tên field theo hợp đồng GraphQL: `search`→`q`, `courseType`→`type`
 * (enum CourseType LEGACY/PACKAGE — admin-course-management-refinements). `subjectId` gửi kèm dù BE
 * hiện BỎ QUA (reserved, course chưa có subject_id) — dropdown Subject vì thế vẫn disable
 * "sắp có" ở UI. page/pageSize KHÔNG thuộc filter (đi riêng qua PageInput).
 */
export function buildAdminCourseFilter(params: CourseListParams): AdminCourseFilterInput {
  const sortOrder = toGraphQLSortOrder(params.sortOrder);
  return {
    ...(params.search ? { q: params.search } : {}),
    ...(params.subjectId ? { subjectId: params.subjectId } : {}),
    // FE CourseStatus là lowercase nhưng BE so exact-match với status UPPERCASE trong DB.
    ...(params.status ? { status: params.status.toUpperCase() } : {}),
    ...(params.courseType ? { type: params.courseType } : {}),
    ...(params.lecturerId ? { lecturerId: params.lecturerId } : {}),
    ...(params.sortBy ? { sortBy: params.sortBy } : {}),
    ...(sortOrder ? { sortOrder } : {}),
  };
}

export function useCourses(params: CourseListParams) {
  return useQuery<PaginatedResponse<Course>, Error>({
    queryKey: coursesKeys.list(params),
    queryFn: () =>
      graphqlRequest<{
        adminCourses: {
          items: Array<{ id: string; title: string; status: string; saleMode?: string }>;
          total: number;
          page: number;
          size: number;
        };
      }>(ADMIN_COURSES_QUERY, {
        filter: buildAdminCourseFilter(params),
        page: { page: Math.max(0, params.page - 1), size: params.pageSize },
      }).then((r) => {
        const now = new Date().toISOString();
        return {
          items: r.adminCourses.items.map((item) => ({
            id: item.id,
            subjectId: "",
            subjectName: "",
            name: item.title,
            summary: "",
            status: item.status as Course["status"],
            workflowStatus: item.status as Course["workflowStatus"],
            lecturerIds: [],
            basePrice: undefined,
            saleMode: item.saleMode as CourseType,
            createdAt: now,
            updatedAt: now,
          })),
          total: r.adminCourses.total,
          page: (r.adminCourses.page ?? 0) + 1,
          pageSize: r.adminCourses.size,
        };
      }),
    placeholderData: (previous) => previous,
  });
}

export function useCourse(id: string | undefined) {
  return useQuery<CourseDetail, Error>({
    queryKey: coursesKeys.detail(id),
    queryFn: () =>
      graphqlRequest<{ adminCourse: AdminCourseGql | null }>(ADMIN_COURSE_QUERY, {
        id,
      }).then((r) => {
        if (!r.adminCourse) throw new Error("Không tìm thấy khoá học");
        return mapAdminCourseToDetail(r.adminCourse);
      }),
    enabled: !!id,
  });
}

// ---------- Owner-scoped managed course detail (F1) ----------

/**
 * Shape của AdminCourseDetail projection do BE trả tại GET /api/v1/courses/{id}/manage
 * (owner-authz requireManage: ownership HOẶC COURSE grant — KHÔNG đòi admin.course.read GLOBAL).
 * Khác GraphQL adminCourse ở chỗ: gọi qua coreClient (owner-scoped), có `instructorId` để suy
 * canManage theo OWNERSHIP, và section/lesson dùng `title` (không phải `name`). Bao gồm lesson DRAFT.
 */
interface ManagedCourseApi {
  id: string;
  title: string;
  slugName: string;
  status: string;
  saleMode?: string | null;
  instructorId: string | null;
  sections: Array<{
    id: string;
    title: string;
    sortOrder: number;
    lessons: Array<{
      id: string;
      title: string;
      type: string;
      free: boolean;
      sortOrder: number;
    }>;
  }>;
}

/** CourseDetail + `instructorId` để trang giảng viên suy canManage = instructorId === me.user.id. */
export interface ManagedCourseDetail extends CourseDetail {
  instructorId: string | null;
}

function mapManagedCourseToDetail(c: ManagedCourseApi): ManagedCourseDetail {
  const tree: CourseTreeNode[] = (c.sections ?? []).map((section) => ({
    id: section.id,
    key: section.id,
    title: section.title,
    type: "section",
    children: (section.lessons ?? []).map((lesson) => ({
      id: lesson.id,
      key: lesson.id,
      title: lesson.title,
      type: "lesson",
      lessonType: lesson.type as LessonType,
    })),
  }));
  const now = new Date().toISOString();
  const status = mapCourseStatus(c.status);
  return {
    id: c.id,
    subjectId: "",
    subjectName: "",
    name: c.title,
    summary: "",
    status,
    workflowStatus: status,
    lecturerIds: [],
    basePrice: undefined,
    saleMode: (c.saleMode as CourseType) ?? undefined,
    instructorId: c.instructorId ?? null,
    createdAt: now,
    updatedAt: now,
    tree,
    publishChecklist: [],
  };
}

/**
 * Khoá do caller QUẢN LÝ (owner) — GET /api/v1/courses/{id}/manage qua coreClient (Bearer). BE
 * requireManage gác theo ownership/COURSE-grant, nên caller không có admin.course.read GLOBAL vẫn
 * đọc được khoá của mình. 403 → ForbiddenError (interceptor) → caller hiển thị lỗi, KHÔNG lộ dữ liệu.
 */
export function useManagedCourse(id: string | undefined) {
  return useQuery<ManagedCourseDetail, Error>({
    queryKey: coursesKeys.managed(id),
    queryFn: () =>
      coreClient
        .get(`/courses/${id}/manage`)
        .then((r) => mapManagedCourseToDetail(r.data as ManagedCourseApi)),
    enabled: !!id,
  });
}

export interface StudentEmailView {
  userId: string;
  username: string;
  email: string;
}

export interface CourseStudentsView {
  courseId: string;
  courseTitle: string;
  slugName: string;
  totalStudents: number;
  students: StudentEmailView[];
}

/**
 * Roster học viên của 1 course. Endpoint report LIVE, KHÔNG dưới /admin nên dùng coreClient:
 * GET /api/v1/courses/admin/reports/courses/{id}/students (quyền BE admin.course.manage).
 * PII (email) — không log, không đưa vào URL/query.
 */
export function useCourseStudents(courseId: string | undefined) {
  return useQuery<CourseStudentsView, Error>({
    queryKey: coursesKeys.students(courseId),
    queryFn: () =>
      coreClient
        .get(`/courses/admin/reports/courses/${courseId}/students`)
        .then((r) => r.data as CourseStudentsView),
    enabled: !!courseId,
  });
}

/** Hình dạng body của AdminContentController.Create/UpdateCourseBody (BE). */
export interface CourseAdminBody {
  title?: string;
  subjectId?: string;
  description?: string;
}

/**
 * Form FE → body admin POST/PATCH /admin/courses. BE nhận `title`/`description` (KHÔNG phải
 * `name`/`summary` như form) — gửi sai key thì (a) tên/tóm tắt không bao giờ persist
 * (CourseCommandApiImpl chỉ set field != null) và (b) audit `Map.of("title", body.title())`
 * ném NPE → 500 cho MỌI lần Lưu/Tạo dù write đã chạy. `saleMode` không map ở đây — body admin
 * không có field đó (đổi type đi đường core PATCH riêng, xem useUpdateCourse).
 */
export function courseAdminBody(values: Partial<Omit<CourseFormValues, "saleMode">>): CourseAdminBody {
  return {
    ...(values.name !== undefined ? { title: values.name } : {}),
    ...(values.subjectId !== undefined ? { subjectId: values.subjectId } : {}),
    ...(values.summary !== undefined ? { description: values.summary } : {}),
  };
}

export function useCreateCourse() {
  const queryClientLocal = useQueryClient();
  return useMutation<Course, Error, CourseFormValues>({
    mutationFn: (values) =>
      apiClient.post("/courses", courseAdminBody(values)).then((r) => r.data as Course),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: coursesKeys.lists() });
    },
  });
}

/**
 * Payload PATCH khi SỬA khoá: chỉ mang `saleMode` khi admin THẬT SỰ đổi type. Gửi lại type cũ
 * tưởng vô hại, nhưng nếu state FE cũ (khoá vừa được nâng PACKAGE ở tab khác) thì giá trị "LEGACY"
 * cũ sẽ dính guard COURSE_TYPE_DOWNGRADE_FORBIDDEN cho một lần sửa tên vô tội.
 */
export function courseUpdatePayload(
  values: CourseFormValues,
  current: Pick<Course, "saleMode">
): Partial<CourseFormValues> {
  const { saleMode, ...rest } = values;
  if (saleMode && saleMode !== current.saleMode) {
    return { ...rest, saleMode };
  }
  return rest;
}

export function useUpdateCourse(id: string | undefined) {
  const queryClientLocal = useQueryClient();
  const invalidate = () => {
    queryClientLocal.invalidateQueries({ queryKey: coursesKeys.detail(id) });
    queryClientLocal.invalidateQueries({ queryKey: coursesKeys.lists() });
    // Trang giảng viên đọc khoá qua useManagedCourse (key managed) — sửa tên/tóm tắt/loại xong phải
    // refetch bản managed, không thì form giữ giá trị cũ khi component re-init từ course prop.
    queryClientLocal.invalidateQueries({ queryKey: coursesKeys.managed(id) });
  };
  return useMutation<Course, Error, Partial<CourseFormValues>>({
    mutationFn: async (values) => {
      const { saleMode, subjectId, name, summary } = values;
      let latest: Course | undefined;
      // Đổi type ĐI QUA core PATCH /api/v1/courses/{id} (CatalogService.update) — nơi DUY NHẤT có
      // guard COURSE_TYPE_DOWNGRADE_FORBIDDEN và provision gói mặc định + backfill purchase khi
      // nâng LEGACY→PACKAGE. Đổi type TRƯỚC các field khác: nếu BE từ chối thì chưa có gì bị ghi.
      if (saleMode) {
        latest = (await coreClient.patch(`/courses/${id}`, { saleMode })).data as Course;
      }
      try {
        // title/description ĐI QUA CORE PATCH (CatalogService.update — owner-authz requireManage):
        // giảng viên sửa tên/tóm tắt khoá CỦA MÌNH mà không cần admin.course.manage GLOBAL (admin PATCH
        // /admin/courses/{id} đòi GLOBAL → instructor 403). Admin vẫn chạy vì có course.manage GLOBAL.
        const coreBody: Record<string, unknown> = {};
        if (name !== undefined) coreBody.title = name;
        if (summary !== undefined) coreBody.description = summary;
        if (Object.keys(coreBody).length > 0) {
          latest = (await coreClient.patch(`/courses/${id}`, coreBody)).data as Course;
        }
        // subjectId: CatalogService.update KHÔNG nhận subjectId → giữ đường admin PATCH (chỉ ADMIN đổi
        // môn; field subjectId disabled với instructor nên không bao giờ gửi từ luồng giảng viên).
        if (subjectId !== undefined) {
          latest = (await apiClient.patch(`/courses/${id}`, { subjectId })).data as Course;
        }
        return latest as Course;
      } catch (err) {
        // saleMode core PATCH ở trên đã COMMIT (LEGACY→PACKAGE không đảo được) mà bước sau fail thì
        // onSuccess KHÔNG chạy — phải invalidate ngay, kẻo bảng/detail còn hiển thị type/tên cũ.
        if (saleMode) invalidate();
        throw err;
      }
    },
    onSuccess: invalidate,
  });
}

const BE_LESSON_TYPES = ["VIDEO", "DOCUMENT", "SLIDE"];

/** lessonType của node → type hợp lệ BE (mặc định DOCUMENT). */
function beLessonType(node: CourseTreeNode): string {
  const type = node.lessonType;
  return type && BE_LESSON_TYPES.includes(type) ? type : "DOCUMENT";
}

/** So sánh 2 dãy id theo đúng thứ tự (dùng để quyết định có cần gọi reorder không). */
function sameOrder(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((id, i) => id === b[i]);
}

/**
 * Đồng bộ cây draft xuống BE bằng cách DIFF draft ↔ server, chỉ ghi phần thay đổi (F2). Không còn
 * PATCH mọi node mỗi lần lưu:
 *  - section/lesson đã tồn tại: chỉ PATCH `name` khi tên ĐỔI (thứ tự đi qua endpoint reorder, KHÔNG
 *    PATCH sortOrder từng node nữa).
 *  - node mới (chưa có id): POST (tuần tự để lấy id section trước khi tạo lesson con).
 *  - xoá: DELETE node server không còn trong draft (xoá section cascade lesson con).
 *  - thứ tự section: POST /courses/{id}/sections/reorder { orderedIds } — CHỈ khi thứ tự khác server.
 *  - thứ tự + REPARENT lesson: PUT /courses/{id}/lessons/reorder { sections:[{sectionId,
 *    orderedLessonIds}] } — CHỈ với section có bố cục lesson đổi. Lesson xuất hiện dưới sectionId khác
 *    hiện tại → BE reparent (vá luôn lỗi mất-dữ-liệu cross-section-move âm thầm trước đây).
 * Node "assignment" (FE-only) bị bỏ qua. Không transaction: lỗi giữa chừng → refetch cho trạng thái thật.
 */
export async function reconcileCourseTree(
  courseId: string,
  draft: CourseTreeNode[],
  server: CourseTreeNode[]
): Promise<void> {
  // --- Chỉ mục trạng thái server để so sánh ---
  const serverSections = server.filter((n) => n.type === "section" && n.id);
  const serverSectionById = new Map(serverSections.map((s) => [s.id as string, s]));
  const serverLessonMeta = new Map<string, { sectionId: string; title: string }>();
  const serverSectionLessonOrder = new Map<string, string[]>();
  for (const s of serverSections) {
    const ids: string[] = [];
    for (const l of s.children ?? []) {
      if (l.type === "lesson" && l.id) {
        serverLessonMeta.set(l.id, { sectionId: s.id as string, title: l.title });
        ids.push(l.id);
      }
    }
    serverSectionLessonOrder.set(s.id as string, ids);
  }

  const keptSectionIds = new Set<string>();
  const keptLessonIds = new Set<string>();
  const orderedSectionIds: string[] = [];
  const draftSectionLessonOrder = new Map<string, string[]>();

  for (const sectionNode of draft) {
    if (sectionNode.type !== "section") continue;
    let sectionId = sectionNode.id;
    if (sectionId) {
      const serverSec = serverSectionById.get(sectionId);
      // Chỉ PATCH khi tên thật sự đổi — tránh ghi thừa (unchanged tree = 0 writes).
      if (serverSec && serverSec.title !== sectionNode.title) {
        await coreClient.patch(`/courses/sections/${sectionId}`, { name: sectionNode.title });
      }
      keptSectionIds.add(sectionId);
    } else {
      // Section mới: sortOrder gợi ý = vị trí hiện tại; reorder cuối cùng chốt lại thứ tự chuẩn.
      const res = await coreClient.post(`/courses/${courseId}/sections`, {
        name: sectionNode.title,
        sortOrder: orderedSectionIds.length,
      });
      sectionId = (res.data as { id: string }).id;
    }
    orderedSectionIds.push(sectionId);

    const lessonIds: string[] = [];
    let lessonIndex = 0;
    for (const lessonNode of sectionNode.children ?? []) {
      if (lessonNode.type !== "lesson") continue; // bỏ assignment (admin-tree-assignment-node-removal)
      const lessonSort = lessonIndex++;
      let lessonId = lessonNode.id;
      if (lessonId) {
        const meta = serverLessonMeta.get(lessonId);
        if (meta && meta.title !== lessonNode.title) {
          await coreClient.patch(`/courses/lessons/${lessonId}`, { name: lessonNode.title });
        }
        keptLessonIds.add(lessonId);
      } else {
        const res = await coreClient.post(`/courses/sections/${sectionId}/lessons`, {
          name: lessonNode.title,
          type: beLessonType(lessonNode),
          sortOrder: lessonSort,
          free: false,
        });
        lessonId = (res.data as { id: string }).id;
      }
      lessonIds.push(lessonId);
    }
    draftSectionLessonOrder.set(sectionId, lessonIds);
  }

  // --- Thứ tự + reparent lesson: reorder CHỈ những section có bố cục lesson đổi ---
  // CHẠY TRƯỚC bước xoá: nếu người dùng kéo bài L từ section A sang B RỒI xoá A rỗng trong CÙNG lần
  // lưu, mà xoá A trước thì cascade BE xoá luôn L (L còn parent = A trên server) → PUT reorder sau đó
  // gọi requireLesson(L) ném "Lesson not found" và bài mất vĩnh viễn. Reparent trước → L về B an toàn,
  // rồi mới xoá A (giờ đã rỗng). Đây chính là lớp mất-dữ-liệu cross-section-move mà F2 phải chặn.
  const reorderSections: Array<{ sectionId: string; orderedLessonIds: string[] }> = [];
  for (const [sectionId, lessonIds] of draftSectionLessonOrder) {
    const serverIds = serverSectionLessonOrder.get(sectionId) ?? [];
    if (!sameOrder(lessonIds, serverIds)) {
      reorderSections.push({ sectionId, orderedLessonIds: lessonIds });
    }
  }
  if (reorderSections.length > 0) {
    await coreClient.put(`/courses/${courseId}/lessons/reorder`, { sections: reorderSections });
  }

  // --- Xoá node ở server không còn trong draft (sau khi đã reparent lesson ra khỏi section sắp xoá) ---
  for (const serverSection of server) {
    if (serverSection.type !== "section" || !serverSection.id) continue;
    if (!keptSectionIds.has(serverSection.id)) {
      await coreClient.delete(`/courses/sections/${serverSection.id}`);
      continue; // section xoá → cascade lessons con (đã reparent bài cần giữ ở bước trên)
    }
    for (const serverLesson of serverSection.children ?? []) {
      if (serverLesson.type === "lesson" && serverLesson.id && !keptLessonIds.has(serverLesson.id)) {
        await coreClient.delete(`/courses/lessons/${serverLesson.id}`);
      }
    }
  }

  // --- Thứ tự section: reorder CHỈ khi khác server (có thể chạy sau xoá) ---
  const serverSectionOrder = serverSections.map((s) => s.id as string);
  if (!sameOrder(orderedSectionIds, serverSectionOrder)) {
    await coreClient.post(`/courses/${courseId}/sections/reorder`, {
      orderedIds: orderedSectionIds,
    });
  }
}

export function useSaveCourseTree(courseId: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<void, Error, { draft: CourseTreeNode[]; server: CourseTreeNode[] }>({
    mutationFn: ({ draft, server }) => {
      if (!courseId) throw new Error("Missing courseId");
      return reconcileCourseTree(courseId, draft, server);
    },
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: coursesKeys.detail(courseId) });
      // Trang giảng viên (MyCourseDetailPage) treo toàn bộ trên useManagedCourse → PHẢI invalidate key
      // managed, nếu không course.tree không refetch: draft store giữ node MỚI chưa có id, bấm Lưu lần 2
      // POST lại chính section/lesson đó → nhân đôi trên server; baseline diff cũng cũ.
      queryClientLocal.invalidateQueries({ queryKey: coursesKeys.managed(courseId) });
    },
    onError: handleAdminMutationError,
  });
}

export function useUpdateCoursePricing(id: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<CourseDetail, Error, { basePrice: number }>({
    mutationFn: ({ basePrice }) =>
      // Chỉ gửi totalPrice — PATCH partial giữ nguyên salePrice hiện có (form pricing admin
      // không có field salePrice; gửi salePrice=basePrice sẽ xoá discount đang set).
      coreClient
        .patch(`/courses/${id}`, { totalPrice: basePrice })
        .then((r) => r.data as CourseDetail),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: coursesKeys.detail(id) });
      queryClientLocal.invalidateQueries({ queryKey: coursesKeys.managed(id) });
    },
    onError: handleAdminMutationError,
  });
}

// ---------- Gói khoá học ----------

/** Một dòng entitlement trong form gói. `raw` giữ bản gốc của loại editor chưa hỗ trợ (EXERCISE). */
export interface PackageEntitlementFormValues {
  type: PackageEntitlement["type"];
  sectionId?: string;
  selectedLessonIds?: string[];
  freeLessonIds?: string[];
  raw?: CreateEntitlementRequest;
}

/** PackageView.entitlement → body gửi lại BE; bỏ null/id (BE nhận undefined, không nhận null). */
export function entitlementToRequest(entitlement: PackageEntitlement): CreateEntitlementRequest {
  return {
    type: entitlement.type,
    ...(entitlement.sectionId ? { sectionId: entitlement.sectionId } : {}),
    ...(entitlement.lessonId ? { lessonId: entitlement.lessonId } : {}),
    ...(nonEmpty(entitlement.selectedLessonIds)
      ? { selectedLessonIds: entitlement.selectedLessonIds as string[] }
      : {}),
    ...(nonEmpty(entitlement.freeLessonIds)
      ? { freeLessonIds: entitlement.freeLessonIds as string[] }
      : {}),
    ...(nonEmpty(entitlement.selectedExerciseIds)
      ? { selectedExerciseIds: entitlement.selectedExerciseIds as string[] }
      : {}),
    ...(nonEmpty(entitlement.freeExerciseIds)
      ? { freeExerciseIds: entitlement.freeExerciseIds as string[] }
      : {}),
  };
}

export interface PackageFormValues {
  name: string;
  slug: string;
  salePrice?: number;
  originalPrice?: number;
  sortOrder?: number;
  defaultPackage?: boolean;
  entitlements?: PackageEntitlementFormValues[];
}

function nonEmpty(ids: string[] | null | undefined): string[] | undefined {
  return ids && ids.length > 0 ? ids : undefined;
}

/**
 * Field BE có nhưng editor CHƯA quản (không có ô nhập nào): giữ nguyên từ bản gốc đọc về (`raw`).
 * Bắt buộc vì PATCH gói xoá sạch entitlement rồi insert lại (PackageService.updatePackage), nên bất
 * kỳ field nào không gửi lại là MẤT quyền của học viên đã mua — im lặng.
 * - `lessonId` (số ít): AccessResolver case LESSON vẫn đọc trước khi cộng selectedLessonIds.
 * - `selectedExerciseIds` / `freeExerciseIds`: quyền bài tập; freeExerciseIds còn là teaser cấp
 *   quyền cả khi chưa mua.
 * Chỉ giữ khi admin KHÔNG đổi loại dòng — đổi loại là chủ ý định nghĩa lại phạm vi.
 */
export function preservedEntitlementFields(
  entitlement: PackageEntitlementFormValues
): Partial<CreateEntitlementRequest> {
  const raw = entitlement.raw;
  if (!raw || raw.type !== entitlement.type) return {};
  return {
    ...(raw.lessonId ? { lessonId: raw.lessonId } : {}),
    ...(nonEmpty(raw.selectedExerciseIds) ? { selectedExerciseIds: raw.selectedExerciseIds } : {}),
    ...(nonEmpty(raw.freeExerciseIds) ? { freeExerciseIds: raw.freeExerciseIds } : {}),
  };
}

/**
 * Subset "ladder" của entitlement PART: cùng một phần, mỗi gói chọn subset bài khác nhau
 * (vd Phần 1 = FREE 4 bài ⊊ PREMIUM 13 bài). AccessResolver ưu tiên `selectedLessonIds`; CHỈ khi nó
 * rỗng mới cấp CẢ PHẦN theo `sectionId`. Editor chưa cho sửa subset này nên phải gửi lại nguyên bản,
 * nếu không: admin sửa mỗi cái tên gói → gói FREE bỗng cấp trọn phần (rò rỉ nội dung trả phí).
 * Bỏ subset khi admin đổi sang section khác — id bài cũ không còn thuộc phạm vi mới.
 */
export function preservedPartLadder(entitlement: PackageEntitlementFormValues): string[] | undefined {
  const raw = entitlement.raw;
  if (!raw || raw.type !== "PART") return undefined;
  if ((raw.sectionId ?? undefined) !== (entitlement.sectionId ?? undefined)) return undefined;
  return nonEmpty(raw.selectedLessonIds);
}

/**
 * Dòng form → `CreateEntitlementRequest`. Chỉ gửi field ứng với `type` (COURSE không gửi field phạm
 * vi nào, PART gửi sectionId, LESSON gửi selectedLessonIds) để BE không hiểu nhầm phạm vi gói (và để
 * không dính COURSE_VALIDATION), CỘNG các field editor chưa quản được lấy
 * lại từ `raw`. Entitlement EXERCISE editor chưa quản được nên gửi lại nguyên bản gốc — PATCH ghi đè
 * cả mảng, không giữ lại là MẤT quyền của gói.
 */
export function buildEntitlementPayload(
  entitlement: PackageEntitlementFormValues
): CreateEntitlementRequest {
  if (entitlement.type === "EXERCISE") {
    return { ...entitlement.raw, type: "EXERCISE" };
  }
  const free = nonEmpty(entitlement.freeLessonIds);
  if (entitlement.type === "COURSE") {
    // Trọn khoá: BE TỪ CHỐI (COURSE_VALIDATION) nếu kèm sectionId/lessonId/selected*Ids, và chính
    // các field đó là thứ phải KHÔNG gửi — gửi nhầm type khác (vd LESSON rỗng) là gói mất sạch quyền.
    // freeExerciseIds là teaser bài tập, editor chưa quản → giữ lại từ bản gốc (chỉ khi admin không
    // đổi loại dòng, cùng quy ước preservedEntitlementFields). selectedExerciseIds/lessonId CỐ Ý bỏ:
    // BE từ chối chúng trên COURSE, mà COURSE vốn đã cấp trọn khoá nên không mất quyền gì.
    const rawFreeExercises =
      entitlement.raw?.type === "COURSE" ? nonEmpty(entitlement.raw.freeExerciseIds) : undefined;
    return {
      type: "COURSE",
      ...(free ? { freeLessonIds: free } : {}),
      ...(rawFreeExercises ? { freeExerciseIds: rawFreeExercises } : {}),
    };
  }
  const preserved = preservedEntitlementFields(entitlement);
  if (entitlement.type === "PART") {
    const ladder = preservedPartLadder(entitlement);
    return {
      type: "PART",
      ...(entitlement.sectionId ? { sectionId: entitlement.sectionId } : {}),
      ...(ladder ? { selectedLessonIds: ladder } : {}),
      ...(free ? { freeLessonIds: free } : {}),
      ...preserved,
    };
  }
  return {
    type: "LESSON",
    ...(nonEmpty(entitlement.selectedLessonIds)
      ? { selectedLessonIds: entitlement.selectedLessonIds! }
      : {}),
    ...(free ? { freeLessonIds: free } : {}),
    ...preserved,
  };
}

export function buildPackagePayload(values: PackageFormValues): CreatePackageRequest {
  return {
    name: values.name,
    slug: values.slug,
    ...(values.salePrice != null ? { salePrice: values.salePrice } : {}),
    ...(values.originalPrice != null ? { originalPrice: values.originalPrice } : {}),
    ...(values.sortOrder != null ? { sortOrder: values.sortOrder } : {}),
    ...(values.defaultPackage != null ? { defaultPackage: values.defaultPackage } : {}),
    entitlements: (values.entitlements ?? []).map(buildEntitlementPayload),
  };
}

/** Gói đã "Ngừng bán" (soft archive của BE) — card của nó chỉ đọc. */
export function isPackageArchived(pkg: CoursePackage | undefined): boolean {
  return pkg?.status?.toUpperCase() === "ARCHIVED";
}

/**
 * `sortOrder` mặc định cho gói MỚI = max hiện có + 1 (`sortOrder` null coi là 0; khoá chưa có gói
 * nào → 0). Bỏ trống ô này thì payload không mang field, BE mặc định 0 — trùng gói "Trọn khoá"
 * (cũng 0) và thứ tự hiển thị trên trang bán thành tuỳ tiện.
 */
export function nextPackageSortOrder(packages: CoursePackage[] | undefined): number {
  const list = packages ?? [];
  if (list.length === 0) return 0;
  return Math.max(...list.map((p) => p.sortOrder ?? 0)) + 1;
}

/**
 * Gói của khoá (bản admin — gồm cả gói đã ngừng bán). Endpoint nằm dưới `/api/v1/courses/**` nên
 * dùng coreClient; `apiClient` sẽ ra `/api/v1/admin/courses/...` là path sai.
 */
export function useCoursePackages(courseId: string | undefined) {
  return useQuery<CoursePackage[], Error>({
    queryKey: coursesKeys.packages(courseId),
    queryFn: () =>
      coreClient.get(`/courses/${courseId}/packages/admin`).then((r) => r.data as CoursePackage[]),
    enabled: !!courseId,
  });
}

/** Invalidate cả danh sách gói lẫn chi tiết khoá sau mỗi thao tác ghi gói. */
function useInvalidatePackages(courseId: string | undefined) {
  const queryClientLocal = useQueryClient();
  return () => {
    queryClientLocal.invalidateQueries({ queryKey: coursesKeys.packages(courseId) });
    queryClientLocal.invalidateQueries({ queryKey: coursesKeys.detail(courseId) });
  };
}

export function useCreateCoursePackage(courseId: string | undefined) {
  const invalidate = useInvalidatePackages(courseId);
  return useMutation<CoursePackage, Error, CreatePackageRequest>({
    mutationFn: (body) =>
      coreClient.post(`/courses/${courseId}/packages`, body).then((r) => r.data as CoursePackage),
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}

export function useUpdateCoursePackage(courseId: string | undefined) {
  const invalidate = useInvalidatePackages(courseId);
  return useMutation<CoursePackage, Error, { packageId: string; body: UpdatePackageRequest }>({
    mutationFn: ({ packageId, body }) =>
      coreClient
        .patch(`/courses/${courseId}/packages/${packageId}`, body)
        .then((r) => r.data as CoursePackage),
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}

/** DELETE = ngừng bán (soft archive): gói rời trang bán, học viên đã mua vẫn giữ quyền. */
export function useArchiveCoursePackage(courseId: string | undefined) {
  const invalidate = useInvalidatePackages(courseId);
  return useMutation<void, Error, { packageId: string }>({
    mutationFn: ({ packageId }) =>
      coreClient.delete(`/courses/${courseId}/packages/${packageId}`).then(() => undefined),
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}

/**
 * Bật bán lại gói đã ngừng bán: PATCH với ĐÚNG `{ status: "ACTIVE" }`.
 * TUYỆT ĐỐI không kèm `entitlements` — `PackageService.updatePackage` xoá sạch entitlement rồi ghi
 * lại theo mảng gửi lên, và chỉ bỏ qua bước đó khi body KHÔNG có khoá `entitlements`. Gửi kèm mảng
 * (kể cả mảng lấy từ form) là rủi ro xoá quyền của học viên đã mua gói này — gói ARCHIVED vẫn cấp
 * quyền cho purchase cũ.
 */
export function useReactivateCoursePackage(courseId: string | undefined) {
  const invalidate = useInvalidatePackages(courseId);
  return useMutation<CoursePackage, Error, { packageId: string }>({
    mutationFn: ({ packageId }) =>
      coreClient
        .patch(`/courses/${courseId}/packages/${packageId}`, { status: "ACTIVE" })
        .then((r) => r.data as CoursePackage),
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}

export function useGrantCourseEnrollment(courseId: string | undefined) {
  return useMutation<void, Error, { userId: string }>({
    mutationFn: (values) => {
      if (!courseId) throw new Error("Missing courseId");
      return apiClient
        .post(`/courses/${courseId}/enrollments`, values)
        .then(() => undefined);
    },
    onError: handleAdminMutationError,
  });
}

export function usePublishCourse(id: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<CourseDetail, Error, { note?: string }>({
    mutationFn: () =>
      coreClient.post(`/courses/${id}/publish`).then((r) => r.data as CourseDetail),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: coursesKeys.detail(id) });
      queryClientLocal.invalidateQueries({ queryKey: coursesKeys.lists() });
      queryClientLocal.invalidateQueries({ queryKey: coursesKeys.managed(id) });
    },
    onError: handleAdminMutationError,
  });
}

export function useUnpublishCourse(id: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<CourseDetail, Error, { reason: string }>({
    mutationFn: (values) =>
      apiClient.post(`/courses/${id}/unpublish`, values).then((r) => r.data as CourseDetail),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: coursesKeys.detail(id) });
      queryClientLocal.invalidateQueries({ queryKey: coursesKeys.lists() });
      queryClientLocal.invalidateQueries({ queryKey: coursesKeys.managed(id) });
    },
    onError: handleAdminMutationError,
  });
}
