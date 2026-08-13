import type { CourseListParams } from "../../types";

export const coursesKeys = {
  all: ["admin", "courses"] as const,
  lists: () => [...coursesKeys.all, "list"] as const,
  list: (params: CourseListParams) => [...coursesKeys.lists(), params] as const,
  details: () => [...coursesKeys.all, "detail"] as const,
  detail: (id: string | undefined) =>
    id ? ([...coursesKeys.details(), id] as const) : coursesKeys.details(),
  managed: (id: string | undefined) =>
    id
      ? ([...coursesKeys.all, "managed", id] as const)
      : ([...coursesKeys.all, "managed"] as const),
  students: (id: string | undefined) =>
    id
      ? ([...coursesKeys.all, "students", id] as const)
      : ([...coursesKeys.all, "students"] as const),
  packages: (id: string | undefined) =>
    id
      ? ([...coursesKeys.all, "packages", id] as const)
      : ([...coursesKeys.all, "packages"] as const),
  /** Danh mục nhóm kỹ năng (career, dùng chung mọi khoá) — không phụ thuộc courseId. */
  skillCategories: () => [...coursesKeys.all, "skill-categories"] as const,
  /** Phân bổ EXP kỹ năng của MỘT khoá. */
  skillExp: (id: string | undefined) =>
    id
      ? ([...coursesKeys.all, "skill-exp", id] as const)
      : ([...coursesKeys.all, "skill-exp"] as const),
};
