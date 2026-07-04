export const catalogKeys = {
  all: ["admin", "commerce", "catalog"] as const,
  coupons: (params: Record<string, unknown>) =>
    [...catalogKeys.all, "coupons", "list", params] as const,
  couponStats: (id: string | undefined) =>
    id ? ([...catalogKeys.all, "coupons", id, "stats"] as const) : catalogKeys.all,
  products: (params: Record<string, unknown>) =>
    [...catalogKeys.all, "products", "list", params] as const,
  fulfillments: (params: Record<string, unknown>) =>
    [...catalogKeys.all, "fulfillments", params] as const,
};
