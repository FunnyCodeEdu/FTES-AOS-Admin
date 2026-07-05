export type AnalyticsDomain =
  | "learning"
  | "subject"
  | "community"
  | "ai"
  | "gamification"
  | "business";

export const ANALYTICS_DOMAINS: AnalyticsDomain[] = [
  "learning",
  "subject",
  "community",
  "ai",
  "gamification",
  "business",
];

export function isAnalyticsDomain(value: string): value is AnalyticsDomain {
  return ANALYTICS_DOMAINS.includes(value as AnalyticsDomain);
}

export interface DateRange {
  from: string;
  to: string;
}

export interface KpiBlock {
  label: string;
  value: number;
  delta: number; // percent vs previous period
  series: number[];
}

export interface ChartData {
  key: string;
  type: "line" | "bar" | "pie";
  title: string;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

export interface OverviewResponse {
  users: KpiBlock;
  revenue: KpiBlock;
  engagement: KpiBlock;
  aiCost: KpiBlock;
}

export interface DomainResponse {
  kpis: KpiBlock[];
  charts: ChartData[];
  breakdown?: {
    columns: { key: string; title: string }[];
    rowsUrl?: string;
  };
}

export interface BreakdownRow {
  [key: string]: string | number | null | undefined;
}

export interface BreakdownResponse {
  items: BreakdownRow[];
  total: number;
  page?: number;
  pageSize?: number;
}

export interface ModerationStatsResponse {
  pendingByType: Record<string, number>;
  resolved7d: number;
  avgResolutionHours: number;
}

export interface ContributionRecentActivity {
  id: string;
  title: string;
  status: "approved" | "rejected" | "pending";
  createdAt: string;
}

export interface ContributionStatsResponse {
  approved: number;
  rejected: number;
  pending: number;
  recentActivity: ContributionRecentActivity[];
}

export interface DomainNavItem {
  domain: AnalyticsDomain;
  label: string;
  permission: string;
}

export const DOMAIN_NAV_ITEMS: DomainNavItem[] = [
  { domain: "learning", label: "Học tập", permission: "analytics.view.learning" },
  { domain: "subject", label: "Môn học", permission: "analytics.view.subject" },
  { domain: "community", label: "Cộng đồng", permission: "analytics.view.community" },
  { domain: "ai", label: "AI", permission: "analytics.view.ai" },
  { domain: "gamification", label: "Gamification", permission: "analytics.view.gamification" },
  { domain: "business", label: "Kinh doanh", permission: "analytics.view.business" },
];
