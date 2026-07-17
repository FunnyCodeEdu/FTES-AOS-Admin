import type { CourseListParams } from "../../types";

export const coursesKeys = {
  all: ["admin", "courses"] as const,
  lists: () => [...coursesKeys.all, "list"] as const,
  list: (params: CourseListParams) => [...coursesKeys.lists(), params] as const,
  details: () => [...coursesKeys.all, "detail"] as const,
  detail: (id: string | undefined) =>
    id ? ([...coursesKeys.details(), id] as const) : coursesKeys.details(),
  students: (id: string | undefined) =>
    id
      ? ([...coursesKeys.all, "students", id] as const)
      : ([...coursesKeys.all, "students"] as const),
};
