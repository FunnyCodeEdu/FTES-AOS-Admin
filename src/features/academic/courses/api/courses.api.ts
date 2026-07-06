import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../../shared/api/client";
import { graphqlRequest, toGraphQLSortOrder } from "../../../../shared/api/graphql";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import type {
  Course,
  CourseDetail,
  CourseFormValues,
  CourseListParams,
  CoursePackage,
  CourseTreeNode,
  PaginatedResponse,
} from "../../types";
import { coursesKeys } from "./courses.keys";

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
          ...(params.status ? { status: params.status } : {}),
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
    queryFn: () => apiClient.get(`/courses/${id}`).then((r) => r.data as CourseDetail),
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
      apiClient.put(`/courses/${id}`, values).then((r) => r.data as Course),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: coursesKeys.detail(id) });
      queryClientLocal.invalidateQueries({ queryKey: coursesKeys.lists() });
    },
  });
}

export function useUpdateCourseTree(id: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<{ tree: CourseTreeNode[] }, Error, { sections: CourseTreeNode[] }>({
    mutationFn: (values) =>
      apiClient.put(`/courses/${id}/tree`, values).then((r) => r.data as { tree: CourseTreeNode[] }),
    onSuccess: (data) => {
      queryClientLocal.setQueryData(coursesKeys.detail(id), (old: CourseDetail | undefined) =>
        old ? { ...old, tree: data.tree } : old
      );
      queryClientLocal.invalidateQueries({ queryKey: coursesKeys.detail(id) });
    },
    onError: handleAdminMutationError,
  });
}

export function useUpdateCoursePricing(id: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<CourseDetail, Error, { basePrice: number; packages: CoursePackage[] }>({
    mutationFn: (values) =>
      apiClient.put(`/courses/${id}/pricing`, values).then((r) => r.data as CourseDetail),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: coursesKeys.detail(id) });
    },
    onError: handleAdminMutationError,
  });
}

export function usePublishCourse(id: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<CourseDetail, Error, { note?: string }>({
    mutationFn: (values) =>
      apiClient.post(`/courses/${id}/publish`, values).then((r) => r.data as CourseDetail),
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
