export const campusesKeys = {
  all: ["admin", "community-campuses"] as const,
  lists: () => [...campusesKeys.all, "list"] as const,
  list: () => [...campusesKeys.lists()] as const,
  details: () => [...campusesKeys.all, "detail"] as const,
  detail: (id: string | undefined) =>
    id ? ([...campusesKeys.details(), id] as const) : campusesKeys.details(),
};
