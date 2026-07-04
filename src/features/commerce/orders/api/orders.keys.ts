export const ordersKeys = {
  all: ["admin", "commerce", "orders"] as const,
  list: (params: Record<string, unknown>) =>
    [...ordersKeys.all, "list", params] as const,
  detail: (id: string | undefined) =>
    id ? ([...ordersKeys.all, "detail", id] as const) : ordersKeys.all,
};
