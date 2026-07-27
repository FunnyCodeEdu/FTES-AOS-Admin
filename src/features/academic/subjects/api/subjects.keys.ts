import type { SubjectListParams } from "../../types";

export const subjectsKeys = {
  all: ["admin", "subjects"] as const,
  lists: () => [...subjectsKeys.all, "list"] as const,
  list: (params: SubjectListParams) => [...subjectsKeys.lists(), params] as const,
  details: () => [...subjectsKeys.all, "detail"] as const,
  detail: (id: string | undefined) =>
    id ? ([...subjectsKeys.details(), id] as const) : subjectsKeys.details(),
  // Staff key theo subject CODE (endpoint /subjects/{code}/staff key theo code, không theo id).
  staff: (code: string | undefined) => [...subjectsKeys.all, "staff", code] as const,
  // Ảnh bìa (Contract A) đọc từ endpoint CORE theo CODE — key theo code.
  cover: (code: string | undefined) => [...subjectsKeys.all, "cover", code] as const,
  // Workspace links (khoá liên kết) đọc từ endpoint CORE /subjects/{code}/links — key theo code.
  links: (code: string | undefined) => [...subjectsKeys.all, "links", code] as const,
};
