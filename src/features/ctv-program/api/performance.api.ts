import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import type { TeamPerformanceMember } from "../shared/types";

const queryKeys = {
  performance: (params: Record<string, unknown>) => ["ctv", "performance", params] as const,
};

const mockPerformance: TeamPerformanceMember[] = [
  { memberId: "mem-1", fullName: "CTV A", email: "ctv@example.com", resourcesProcessed: 12, postsModerated: 34, score: 46 },
];

export interface PerformanceParams {
  range?: string;
  scopeId?: string;
}

export function useTeamPerformance(params: PerformanceParams = {}) {
  return useQuery<TeamPerformanceMember[], Error>({
    queryKey: queryKeys.performance(params as Record<string, unknown>),
    queryFn: async () => {
      void apiClient;
      let items = [...mockPerformance];
      if (params.scopeId) items = items.filter((m) => m.memberId !== params.scopeId); // mock filter placeholder
      return items;
    },
  });
}
