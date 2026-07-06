import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../../shared/api/client";
import { graphqlRequest } from "../../../../shared/api/graphql";
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

const ADMIN_COURSES_QUERY = `query AdminCourses($page: Int, $pageSize: Int, $search: String, $subjectId: String, $status: String, $lecturerId: String, $sortBy: String, $sortOrder: String) {
  adminCourses(page: $page, pageSize: $pageSize, search: $search, subjectId: $subjectId, status: $status, lecturerId: $lecturerId, sortBy: $sortBy, sortOrder: $sortOrder) {
    items {
      id
      subjectId
      subjectName
      name
      summary
      status
      workflowStatus
      lecturerIds
      basePrice
      createdAt
      updatedAt
    }
    total
    page
    pageSize
  }
}`;

export function useCourses(params: CourseListParams) {
  return useQuery<PaginatedResponse<Course>, Error>({
    queryKey: coursesKeys.list(params),
    queryFn: () =>
      graphqlRequest<{ adminCourses: PaginatedResponse<Course> }>(ADMIN_COURSES_QUERY, {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        subjectId: params.subjectId,
        status: params.status,
        lecturerId: params.lecturerId,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      }).then((r) => r.adminCourses),
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
