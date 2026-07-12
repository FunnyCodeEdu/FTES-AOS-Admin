export const lessonsKeys = {
  all: ["admin", "lessons"] as const,
  content: (id: string | undefined) =>
    id ? ([...lessonsKeys.all, "content", id] as const) : lessonsKeys.all,
  adminContent: (id: string | undefined) =>
    id ? ([...lessonsKeys.all, "admin-content", id] as const) : lessonsKeys.all,
  preview: (id: string | undefined) =>
    id ? ([...lessonsKeys.all, "preview", id] as const) : lessonsKeys.all,
  coursePreviewDefault: (courseId: string | undefined) =>
    courseId
      ? ([...lessonsKeys.all, "course-preview-default", courseId] as const)
      : lessonsKeys.all,
};
