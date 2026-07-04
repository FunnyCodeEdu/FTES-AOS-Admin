export const walletsKeys = {
  all: ["admin", "commerce", "wallets"] as const,
  wallet: (userId: string | undefined) =>
    userId ? ([...walletsKeys.all, userId] as const) : walletsKeys.all,
  ledger: (userId: string | undefined, params: Record<string, unknown>) =>
    userId ? ([...walletsKeys.all, userId, "ledger", params] as const) : walletsKeys.all,
  pendingAdjustments: (params: Record<string, unknown>) =>
    [...walletsKeys.all, "adjustments", "pending", params] as const,
};
