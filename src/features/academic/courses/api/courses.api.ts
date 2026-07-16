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
  PaginatedResponse,
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
    packages: [],
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
        filter: {
          ...(params.search ? { q: params.search } : {}),
          ...(params.subjectId ? { subjectId: params.subjectId } : {}),
          ...(params.status ? { status: params.status } : {}),
          ...(params.courseType ? { type: params.courseType } : {}),
          ...(params.lecturerId ? { lecturerId: params.lecturerId } : {}),
          ...(params.sortBy ? { sortBy: params.sortBy } : {}),
          ...(toGraphQLSortOrder(params.sortOrder)
            ? { sortOrder: toGraphQLSortOrder(params.sortOrder) }
            : {}),
        },
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

export function useCreateCourse() {
  const queryClientLocal = useQueryClient();
  return useMutation<Course, Error, CourseFormValues>({
    mutationFn: (values) =>
      apiClient.post("/courses", values).then((r) => r.data as Course),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: coursesKeys.lists() });
    },
  });
}

export function useUpdateCourse(id: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<Course, Error, Partial<CourseFormValues>>({
    mutationFn: (values) =>
      // BE là @PatchMapping /admin/courses/{id} (AdminContentController) — PUT trả 405.
      apiClient.patch(`/courses/${id}`, values).then((r) => r.data as Course),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: coursesKeys.detail(id) });
      queryClientLocal.invalidateQueries({ queryKey: coursesKeys.lists() });
    },
  });
}

const BE_LESSON_TYPES = ["VIDEO", "DOCUMENT", "SLIDE"];

/** lessonType của node → type hợp lệ BE (mặc định DOCUMENT). */
function beLessonType(node: CourseTreeNode): string {
  const type = node.lessonType;
  return type && BE_LESSON_TYPES.includes(type) ? type : "DOCUMENT";
}

/**
 * Đồng bộ cây draft xuống BE qua creator endpoints (không có bulk /tree). Tuần tự để lấy id
 * section mới trước khi tạo lesson con; sortOrder = vị trí trong mảng. Node "assignment" (khái niệm
 * FE-only, KHÔNG persist) bị bỏ qua — BE model chỉ section→lesson. Từ change
 * admin-tree-assignment-node-removal, tree editor không còn cho thêm node assignment và hiển thị
 * cảnh báo/nút gỡ cho node cũ còn sót, nên bước skip dưới đây chỉ là lưới an toàn (không còn "drop im
 * lặng" — user đã thấy cảnh báo). Xoá section thì cascade lesson con nên chỉ DELETE section. Không
 * transaction: lỗi giữa chừng → phần đã ghi ở BE, refetch cho thấy trạng thái thật.
 */
export async function reconcileCourseTree(
  courseId: string,
  draft: CourseTreeNode[],
  server: CourseTreeNode[]
): Promise<void> {
  const keptSectionIds = new Set<string>();
  const keptLessonIds = new Set<string>();

  let sectionIndex = 0;
  for (const sectionNode of draft) {
    if (sectionNode.type !== "section") continue;
    const sortOrder = sectionIndex++;
    let sectionId = sectionNode.id;
    if (sectionId) {
      await coreClient.patch(`/courses/sections/${sectionId}`, {
        name: sectionNode.title,
        sortOrder,
      });
      keptSectionIds.add(sectionId);
    } else {
      const res = await coreClient.post(`/courses/${courseId}/sections`, {
        name: sectionNode.title,
        sortOrder,
      });
      sectionId = (res.data as { id: string }).id;
    }

    let lessonIndex = 0;
    for (const lessonNode of sectionNode.children ?? []) {
      if (lessonNode.type !== "lesson") continue; // lưới an toàn: bỏ assignment (xem admin-tree-assignment-node-removal)
      const lessonSort = lessonIndex++;
      if (lessonNode.id) {
        await coreClient.patch(`/courses/lessons/${lessonNode.id}`, {
          name: lessonNode.title,
          sortOrder: lessonSort,
        });
        keptLessonIds.add(lessonNode.id);
      } else {
        await coreClient.post(`/courses/sections/${sectionId}/lessons`, {
          name: lessonNode.title,
          type: beLessonType(lessonNode),
          sortOrder: lessonSort,
          free: false,
        });
      }
    }
  }

  // Xoá node ở server không còn trong draft.
  for (const serverSection of server) {
    if (serverSection.type !== "section" || !serverSection.id) continue;
    if (!keptSectionIds.has(serverSection.id)) {
      await coreClient.delete(`/courses/sections/${serverSection.id}`);
      continue; // section xoá → cascade lessons con
    }
    for (const serverLesson of serverSection.children ?? []) {
      if (serverLesson.type === "lesson" && serverLesson.id && !keptLessonIds.has(serverLesson.id)) {
        await coreClient.delete(`/courses/lessons/${serverLesson.id}`);
      }
    }
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
    },
    onError: handleAdminMutationError,
  });
}

export function useUpdateCoursePricing(id: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<CourseDetail, Error, { basePrice: number; packages: CoursePackage[] }>({
    mutationFn: ({ basePrice }) =>
      // packages: no BE counterpart on PATCH /courses/{id}; separate concern.
      // Chỉ gửi totalPrice — PATCH partial giữ nguyên salePrice hiện có (form pricing admin
      // không có field salePrice; gửi salePrice=basePrice sẽ xoá discount đang set).
      coreClient
        .patch(`/courses/${id}`, { totalPrice: basePrice })
        .then((r) => r.data as CourseDetail),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: coursesKeys.detail(id) });
    },
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
    },
    onError: handleAdminMutationError,
  });
}
