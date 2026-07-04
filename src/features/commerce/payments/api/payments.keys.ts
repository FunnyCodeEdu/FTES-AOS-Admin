export const paymentsKeys = {
  all: ["admin", "commerce", "payments"] as const,
  list: (params: Record<string, unknown>) =>
    [...paymentsKeys.all, "list", params] as const,
  reconciliation: (range: { dateFrom?: string; dateTo?: string }) =>
    [...paymentsKeys.all, "reconciliation", range] as const,
  revenue: ["admin", "commerce", "revenue", "summary"] as const,
  config: ["admin", "commerce", "config"] as const,
};
