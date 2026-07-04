import type { PackListParams } from "../../types";

export const packsKeys = {
  all: ["admin", "packs"] as const,
  lists: () => [...packsKeys.all, "list"] as const,
  list: (params: PackListParams) => [...packsKeys.lists(), params] as const,
  details: () => [...packsKeys.all, "detail"] as const,
  detail: (id: string | undefined) =>
    id ? ([...packsKeys.details(), id] as const) : packsKeys.details(),
};
