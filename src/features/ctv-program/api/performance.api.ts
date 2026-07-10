import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import type { TeamPerformanceMember } from "../shared/types";

const queryKeys = {
  performance: (params: Record<string, unknown>) => ["ctv", "performance", params] as const,
};

export interface PerformanceParams {
  range?: string;
  scopeId?: string;
}

export function useTeamPerformance(params: PerformanceParams = {}) {
  return useQuery<TeamPerformanceMember[], Error>({
    queryKey: queryKeys.performance(params as Record<string, unknown>),
    queryFn: async () => {
      const res = await apiClient.get<TeamPerformanceMember[]>("/ctv/performance", {
        params: {
          ...(params.range ? { range: params.range } : {}),
          ...(params.scopeId ? { scopeId: params.scopeId } : {}),
        },
      });
      return res.data;
    },
  });
}
