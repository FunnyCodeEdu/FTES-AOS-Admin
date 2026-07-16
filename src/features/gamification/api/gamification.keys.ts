export const gamificationKeys = {
  all: ["admin", "gamification"] as const,
  quests: () => [...gamificationKeys.all, "quests"] as const,
  xpRules: () => [...gamificationKeys.all, "xp-rules"] as const,
  rewardPools: () => [...gamificationKeys.all, "reward-pools"] as const,
  rewardPoolItems: (poolId: string) =>
    [...gamificationKeys.all, "reward-pools", poolId, "items"] as const,
  seasons: () => [...gamificationKeys.all, "seasons"] as const,
};
