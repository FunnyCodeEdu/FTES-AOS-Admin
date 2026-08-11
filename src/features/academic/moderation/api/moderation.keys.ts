import type { ModerationQueueParams } from "../../types";

/**
 * Query-key factory cho hàng đợi duyệt học liệu. Namespace RIÊNG `["admin","resource-moderation"]`
 * chứ không dùng chung `resourcesKeys` vì nguồn dữ liệu khác hẳn: hàng đợi đọc endpoint CÔNG KHAI
 * `/api/v1/resources/moderation/pending` (đã scope theo `approvableSubjectIds` phía server), còn
 * `resourcesKeys` đọc GraphQL `adminResources` (admin-global). Trộn hai nguồn vào một key sẽ khiến
 * cache của bên này ghi đè bên kia.
 */
export const resourceModerationKeys = {
  all: ["admin", "resource-moderation"] as const,
  queues: () => [...resourceModerationKeys.all, "queue"] as const,
  queue: (params: ModerationQueueParams) =>
    [...resourceModerationKeys.queues(), params] as const,
  details: () => [...resourceModerationKeys.all, "detail"] as const,
  detail: (id: string | undefined) =>
    id ? ([...resourceModerationKeys.details(), id] as const) : resourceModerationKeys.details(),
  versions: (id: string | undefined) =>
    [...resourceModerationKeys.all, "versions", id] as const,
  album: (id: string | undefined) => [...resourceModerationKeys.all, "album", id] as const,
};
