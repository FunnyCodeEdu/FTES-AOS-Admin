export const refundsKeys = {
  all: ["admin", "commerce", "refunds"] as const,
  list: (params: Record<string, unknown>) =>
    [...refundsKeys.all, "list", params] as const,
  detail: (id: string | undefined) =>
    id ? ([...refundsKeys.all, "detail", id] as const) : refundsKeys.all,
};
