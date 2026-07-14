export const categoriesKeys = {
  all: ["admin", "course-categories"] as const,
  lists: () => [...categoriesKeys.all, "list"] as const,
  list: () => [...categoriesKeys.lists()] as const,
  details: () => [...categoriesKeys.all, "detail"] as const,
  detail: (id: string | undefined) =>
    id ? ([...categoriesKeys.details(), id] as const) : categoriesKeys.details(),
};
