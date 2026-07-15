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
};
