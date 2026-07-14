import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, coreClient } from "../../../../shared/api/client";
import type { CategoryFormValues, CourseCategory } from "../types";
import { categoriesKeys } from "./categories.keys";

// Raw shape returned by the public taxonomy endpoint. Fields are mapped
// defensively because the backend may name the count differently.
interface RawCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  courseCount?: number;
  count?: number;
  totalCourses?: number;
}

function mapCategory(raw: RawCategory): CourseCategory {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    description: raw.description ?? undefined,
    courseCount: raw.courseCount ?? raw.count ?? raw.totalCourses ?? 0,
  };
}

// List via public taxonomy endpoint (`/api/v1/courses/categories`) so we get the
// `courseCount` per category. Writes go through the admin endpoints.
export function useCategories() {
  return useQuery<CourseCategory[], Error>({
    queryKey: categoriesKeys.list(),
    queryFn: () =>
      coreClient.get("/courses/categories").then((r) => {
        const data = r.data as RawCategory[] | { items?: RawCategory[] } | null;
        const rows = Array.isArray(data) ? data : data?.items ?? [];
        return rows.map(mapCategory);
      }),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation<CourseCategory, Error, CategoryFormValues>({
    mutationFn: (values) =>
      apiClient.post("/course-categories", values).then((r) => r.data as CourseCategory),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoriesKeys.lists() });
    },
  });
}

export function useUpdateCategory(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation<CourseCategory, Error, CategoryFormValues>({
    mutationFn: (values) =>
      apiClient.put(`/course-categories/${id}`, values).then((r) => r.data as CourseCategory),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoriesKeys.lists() });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (categoryId) =>
      apiClient.delete(`/course-categories/${categoryId}`).then(() => undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoriesKeys.lists() });
    },
  });
}
