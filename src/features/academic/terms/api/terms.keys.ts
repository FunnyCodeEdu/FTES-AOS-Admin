export const termsKeys = {
  all: ["admin", "terms"] as const,
  lists: () => [...termsKeys.all, "list"] as const,
  list: () => [...termsKeys.lists()] as const,
  details: () => [...termsKeys.all, "detail"] as const,
  detail: (id: string | undefined) =>
    id ? ([...termsKeys.details(), id] as const) : termsKeys.details(),
  // Khoá trong kỳ — key theo term id (endpoint /terms/{id}/courses).
  courses: (id: string | undefined) => [...termsKeys.all, "courses", id] as const,
  // Tóm tắt học viên ảnh hưởng — key theo term id (endpoint /terms/{id}/enrollments).
  enrollments: (id: string | undefined) => [...termsKeys.all, "enrollments", id] as const,
};
