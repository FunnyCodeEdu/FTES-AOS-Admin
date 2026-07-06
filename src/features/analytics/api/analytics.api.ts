import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import { graphqlRequest } from "../../../shared/api/graphql";
import { useAuthStore } from "../../../features/auth/store";
import type {
  AnalyticsDomain,
  BreakdownResponse,
  ContributionStatsResponse,
  DateRange,
  DomainResponse,
  ModerationStatsResponse,
  OverviewResponse,
} from "../shared/types";

const ADMIN_DASHBOARD_QUERY = `query AdminDashboard($domain: String!) {
  adminDashboard(domain: $domain) {
    users { label value delta series }
    revenue { label value delta series }
    engagement { label value delta series }
    aiCost { label value delta series }
  }
}`;

const ANALYTICS_QUERY = `query Analytics($domain: String!, $range: DateRangeInput!) {
  analytics(domain: $domain, range: $range) {
    kpis { label value delta series }
    charts { key type title labels datasets { label data color } }
  }
}`;

// Assumption: analytics endpoints are defined by change admin-api (FTES-AOS-Backend).
// Until the backend is ready, these hooks fall back to deterministic mock data so the
// UI can be developed and reviewed without a live analytics service.

const MOCK_ENABLED = true;

function randomSeries(length: number, max: number): number[] {
  return Array.from({ length }, () => Math.round(Math.random() * max));
}

function mockOverview(range: DateRange): OverviewResponse {
  const days = Math.max(7, Math.min(90, Math.round((+new Date(range.to) - +new Date(range.from)) / 86400000)));
  return {
    users: { label: "Ngườii dùng", value: 12480, delta: 12.5, series: randomSeries(days, 200) },
    revenue: { label: "Doanh thu", value: 384_500_000, delta: -3.2, series: randomSeries(days, 20_000_000) },
    engagement: { label: "Tương tác", value: 86_200, delta: 8.7, series: randomSeries(days, 1500) },
    aiCost: { label: "Chi phí AI", value: 12_400_000, delta: 15.3, series: randomSeries(days, 600_000) },
  };
}

function mockDomain(_domain: AnalyticsDomain, range: DateRange): DomainResponse {
  const days = Math.max(7, Math.min(90, Math.round((+new Date(range.to) - +new Date(range.from)) / 86400000)));
  const labels = Array.from({ length: days }, (_, i) => {
    const d = new Date(range.from);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  return {
    kpis: [
      { label: "Chỉ số chính 1", value: Math.round(Math.random() * 10000), delta: Math.round((Math.random() - 0.5) * 40), series: randomSeries(days, 500) },
      { label: "Chỉ số chính 2", value: Math.round(Math.random() * 50000), delta: Math.round((Math.random() - 0.5) * 30), series: randomSeries(days, 2000) },
    ],
    charts: [
      {
        key: "trend",
        type: "line",
        title: "Xu hướng",
        labels,
        datasets: [{ label: "Số liệu", data: randomSeries(days, 1000), color: "#1677ff" }],
      },
      {
        key: "distribution",
        type: "bar",
        title: "Phân phối",
        labels: ["A", "B", "C", "D", "E"],
        datasets: [{ label: "Giá trị", data: randomSeries(5, 1000), color: "#52c41a" }],
      },
    ],
  };
}

function mockBreakdown(domain: AnalyticsDomain, page: number, pageSize: number): BreakdownResponse {
  const total = 47;
  const items = Array.from({ length: Math.min(pageSize, total - (page - 1) * pageSize) }, (_, i) => ({
    id: `${domain}-${(page - 1) * pageSize + i + 1}`,
    name: `${domain} item ${(page - 1) * pageSize + i + 1}`,
    value: Math.round(Math.random() * 1000),
    rate: `${Math.round(Math.random() * 100)}%`,
  }));
  return { items, total, page, pageSize };
}

function mockModerationStats(): ModerationStatsResponse {
  return {
    pendingByType: { spam: 12, abuse: 5, copyright: 2, other: 3 },
    resolved7d: 48,
    avgResolutionHours: 4.5,
  };
}

function mockContributionStats(scopeType: string, scopeId: string): ContributionStatsResponse {
  return {
    approved: Math.round(Math.random() * 100) + 20,
    rejected: Math.round(Math.random() * 30),
    pending: Math.round(Math.random() * 15),
    recentActivity: Array.from({ length: 5 }, (_, i) => ({
      id: `act-${i}`,
      title: `Đóng góp ${scopeType}/${scopeId} #${i + 1}`,
      status: (["approved", "rejected", "pending"] as const)[Math.floor(Math.random() * 3)],
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    })),
  };
}

export const analyticsKeys = {
  all: ["analytics"] as const,
  overview: (range: DateRange) => [...analyticsKeys.all, "overview", range] as const,
  domain: (domain: AnalyticsDomain, range: DateRange) => [...analyticsKeys.all, "domain", domain, range] as const,
  breakdown: (domain: AnalyticsDomain, range: DateRange, page: number, pageSize: number, sort?: string) =>
    [...analyticsKeys.domain(domain, range), "breakdown", page, pageSize, sort] as const,
  moderation: () => [...analyticsKeys.all, "moderation-stats"] as const,
  contribution: (scopeType: string, scopeId: string, range: DateRange) =>
    [...analyticsKeys.all, "contribution", scopeType, scopeId, range] as const,
};

export function useAnalyticsOverview(range: DateRange) {
  return useQuery<OverviewResponse, Error>({
    queryKey: analyticsKeys.overview(range),
    queryFn: () =>
      MOCK_ENABLED
        ? Promise.resolve(mockOverview(range))
        : graphqlRequest<{ adminDashboard: OverviewResponse }>(ADMIN_DASHBOARD_QUERY, {
            domain: "overview",
          }).then((r) => r.adminDashboard),
    staleTime: 60 * 1000,
  });
}

export function useAnalyticsDomain(domain: AnalyticsDomain, range: DateRange) {
  return useQuery<DomainResponse, Error>({
    queryKey: analyticsKeys.domain(domain, range),
    queryFn: () =>
      MOCK_ENABLED
        ? Promise.resolve(mockDomain(domain, range))
        : graphqlRequest<{ analytics: DomainResponse }>(ANALYTICS_QUERY, {
            domain,
            range: { from: range.from, to: range.to },
          }).then((r) => r.analytics),
    staleTime: 60 * 1000,
  });
}

export function useAnalyticsBreakdown(
  domain: AnalyticsDomain,
  range: DateRange,
  page: number,
  pageSize: number,
  sort?: string
) {
  return useQuery<BreakdownResponse, Error>({
    queryKey: analyticsKeys.breakdown(domain, range, page, pageSize, sort),
    queryFn: () =>
      MOCK_ENABLED
        ? Promise.resolve(mockBreakdown(domain, page, pageSize))
        : apiClient
            .get(`/analytics/domains/${domain}/breakdown`, { params: { ...range, page, pageSize, sort } })
            .then((r) => r.data as BreakdownResponse),
    staleTime: 60 * 1000,
  });
}

export function useModerationStats() {
  return useQuery<ModerationStatsResponse, Error>({
    queryKey: analyticsKeys.moderation(),
    queryFn: () =>
      MOCK_ENABLED
        ? Promise.resolve(mockModerationStats())
        : apiClient.get("/analytics/moderation-stats").then((r) => r.data as ModerationStatsResponse),
    staleTime: 60 * 1000,
  });
}

export function useContributionStats(scopeType: string, scopeId: string, range: DateRange) {
  return useQuery<ContributionStatsResponse, Error>({
    queryKey: analyticsKeys.contribution(scopeType, scopeId, range),
    queryFn: () =>
      MOCK_ENABLED
        ? Promise.resolve(mockContributionStats(scopeType, scopeId))
        : apiClient
            .get("/analytics/contribution-stats", { params: { scopeType, scopeId, ...range } })
            .then((r) => r.data as ContributionStatsResponse),
    enabled: !!scopeType && !!scopeId,
    staleTime: 60 * 1000,
  });
}

// CSV export is intentionally not a TanStack Query mutation. The button fetches the
// blob directly (bypassing the JSON envelope interceptor) and triggers a browser download.
export async function exportDomainCsv(domain: AnalyticsDomain, range: DateRange): Promise<Blob> {
  if (MOCK_ENABLED) {
    const csv = `domain,date,value\n${domain},${range.from},100\n${domain},${range.to},200\n`;
    return new Blob([csv], { type: "text/csv;charset=utf-8;" });
  }

  const token = useAuthStore.getState().accessToken;
  const base = `${import.meta.env.VITE_API_BASE_URL ?? ""}/api/v1/admin`;
  const params = new URLSearchParams({ from: range.from, to: range.to });
  const response = await fetch(`${base}/analytics/domains/${domain}/export?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) {
    throw new Error(`Export thất bại: ${response.statusText}`);
  }
  return response.blob();
}
