import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import type { MarketActivityPage, MarketActivityParams, MarketOverview, MarketRange } from "./types";

export function useMarketOverview(range: MarketRange) {
  return useQuery<MarketOverview, Error>({
    queryKey: ["analytics", "market", range],
    queryFn: () => apiClient.get<MarketOverview>("/analytics/market-insights", { params: range }).then(r => r.data),
    staleTime: 60_000,
  });
}

export function useMarketActivity(params: MarketActivityParams, enabled: boolean) {
  return useQuery<MarketActivityPage, Error>({
    queryKey: ["analytics", "market", "activity", params],
    queryFn: () => apiClient.get<MarketActivityPage>("/analytics/market-insights/activity", {
      params: { ...params, size: 50 },
    }).then(r => r.data),
    enabled,
    staleTime: 30_000,
  });
}
