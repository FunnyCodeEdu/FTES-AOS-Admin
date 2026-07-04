import type { ResourceListParams } from "../../types";

export const resourcesKeys = {
  all: ["admin", "resources"] as const,
  lists: () => [...resourcesKeys.all, "list"] as const,
  list: (params: ResourceListParams) => [...resourcesKeys.lists(), params] as const,
  details: () => [...resourcesKeys.all, "detail"] as const,
  detail: (id: string | undefined) =>
    id ? ([...resourcesKeys.details(), id] as const) : resourcesKeys.details(),
  versions: (id: string | undefined) =>
    id ? ([...resourcesKeys.all, "versions", id] as const) : ([...resourcesKeys.all, "versions"] as const),
  reviewQueue: (params: ResourceListParams) =>
    [...resourcesKeys.all, "review-queue", params] as const,
};
