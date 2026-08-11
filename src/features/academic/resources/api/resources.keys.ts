import type { ResourceListParams } from "../../types";

export const resourcesKeys = {
  all: ["admin", "resources"] as const,
  lists: () => [...resourcesKeys.all, "list"] as const,
  list: (params: ResourceListParams) => [...resourcesKeys.lists(), params] as const,
  details: () => [...resourcesKeys.all, "detail"] as const,
  detail: (id: string | undefined) =>
    id ? ([...resourcesKeys.details(), id] as const) : resourcesKeys.details(),
  // Album ảnh của học liệu type=FE (GET /api/v1/resources/{id}/images) — treo dưới detail để
  // invalidate detail cũng cuốn theo album.
  feAlbum: (id: string | undefined) =>
    id
      ? ([...resourcesKeys.details(), id, "fe-album"] as const)
      : ([...resourcesKeys.details(), "fe-album"] as const),
  versions: (id: string | undefined) =>
    id ? ([...resourcesKeys.all, "versions", id] as const) : ([...resourcesKeys.all, "versions"] as const),
  reviewQueue: (params: ResourceListParams) =>
    [...resourcesKeys.all, "review-queue", params] as const,
};
