import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import type {
  AnalyticsDomain,
  BreakdownResponse,
  BreakdownRow,
  ChartData,
  ContributionStatsResponse,
  DateRange,
  DomainResponse,
  KpiBlock,
  ModerationStatsResponse,
  OverviewResponse,
} from "../shared/types";

// ---------------------------------------------------------------------------
// BE THẬT: REST proxy `/api/v1/admin/analytics/dashboards/{domain}` (guard flat leaf
// `admin.analytics.read` — AdminAnalyticsProxyController). CỐ TÌNH dùng REST proxy thay vì GraphQL
// `adminDashboard(domain)`/`analytics(domain)` vì query GraphQL có ARG đang dính bug hệ thống
// "401 by-arg" (agent khác điều tra) + schema trả JSON opaque `widgets`/`data`, không phải field
// structured mà FE cần. REST proxy trả CÙNG dữ liệu `analyticsQuery.dashboard(...)` nhưng né bug.
//
// Shape thật (envelope đã được apiClient bóc → còn `data`):
//   { domain, widgets: [ { key, title, series: Row[]|null, value: scalar|null, table: Row[]|null } ],
//     refreshedAt }
// Mỗi domain có widget riêng (design analytics §2 / DashboardService):
//   learning      → series study_over_time      {d, study_seconds, lessons}
//   subject       → series subject_daily         {d, enrollments, completions, active_users}
//   community     → series community_daily       {d, posts, answers_accepted, group_joins, active_users, engagement_rate}
//   ai            → table  ai_cost               {provider, feature, calls, cost_usd}
//   gamification  → series gamification_daily     {d, xp_earned, badges, active_users}
//   business      → value  total_revenue + series revenue_daily {d, revenue, orders, aov, coupon_usage, conversion_rate}
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

interface RawWidget {
  key: string;
  title: string;
  series: Row[] | null;
  value: unknown | null;
  table: Row[] | null;
}

interface RawDashboard {
  domain: string;
  widgets: RawWidget[];
  refreshedAt?: string;
}

const CHART_COLORS = ["#1677ff", "#52c41a", "#faad14", "#f5222d", "#722ed1", "#13c2c2"];

async function fetchDashboard(domain: AnalyticsDomain, range: DateRange): Promise<RawDashboard> {
  const res = await apiClient.get<RawDashboard>(`/analytics/dashboards/${domain}`, {
    params: { from: range.from, to: range.to },
  });
  const data = res.data;
  return { domain: data?.domain ?? domain, widgets: data?.widgets ?? [], refreshedAt: data?.refreshedAt };
}

// -- Widget → FE mapping helpers -------------------------------------------

function toNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isNumericValue(v: unknown): boolean {
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "string" && v.trim() !== "") return Number.isFinite(Number(v));
  return false;
}

/** Cột trục (x): cột đầu tiên không phải số (ngày/category) — vd `d`, `provider`. */
function pickAxisKey(rows: Row[]): string | null {
  if (!rows.length) return null;
  const keys = Object.keys(rows[0]);
  const nonNumeric = keys.find((k) => rows.some((r) => !isNumericValue(r[k])));
  return nonNumeric ?? keys[0] ?? null;
}

/** Các cột số (loại trục) để dựng dataset/KPI. */
function numericKeys(rows: Row[], axisKey: string | null): string[] {
  if (!rows.length) return [];
  return Object.keys(rows[0]).filter((k) => k !== axisKey && rows.every((r) => isNumericValue(r[k])));
}

function rowsToChart(
  key: string,
  title: string,
  rows: Row[],
  type: "line" | "bar"
): ChartData | null {
  const axisKey = pickAxisKey(rows);
  const numKeys = numericKeys(rows, axisKey);
  if (!axisKey || numKeys.length === 0) return null;
  const labels = rows.map((r) => String(r[axisKey] ?? ""));
  const datasets = numKeys.map((k, i) => ({
    label: k,
    data: rows.map((r) => toNumber(r[k])),
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));
  return { key, type, title, labels, datasets };
}

/** KPI headline suy từ 1 cột số: value = tổng, series = giá trị theo hàng, delta = %(cuối vs đầu). */
function colKpi(label: string, rows: Row[] | null | undefined, col: string): KpiBlock {
  const values = (rows ?? []).map((r) => toNumber(r[col]));
  const sum = values.reduce((a, b) => a + b, 0);
  const first = values.find((v) => v !== 0) ?? 0;
  const last = values.length ? values[values.length - 1] : 0;
  const delta = first ? ((last - first) / Math.abs(first)) * 100 : 0;
  return { key: col, label, value: sum, delta, series: values };
}

const KPI_LABELS: Record<string, string> = {
  active_learners: "Học viên hoạt động",
  lessons_completed: "Bài học hoàn thành",
  study_seconds: "Thời gian học",
  enrollments: "Lượt ghi danh",
  completions: "Hoàn thành",
  active_users: "Người dùng hoạt động",
  posts: "Bài viết",
  comments: "Bình luận",
  group_joins: "Tham gia nhóm",
  calls: "Lượt gọi AI",
  successful_calls: "Thành công",
  failed_calls: "Thất bại",
  cost_usd: "Chi phí AI (USD)",
  xp_earned: "XP đã trao",
  badges: "Huy hiệu",
  revenue: "Doanh thu",
  orders: "Đơn thành công",
  aov: "Giá trị đơn trung bình",
  coupon_usage: "Đơn dùng mã giảm",
  refunds: "Đơn hoàn tiền",
  pending_orders: "Đơn chờ thanh toán",
};

function widgetsToDomainResponse(widgets: RawWidget[], refreshedAt?: string): DomainResponse {
  const kpis: KpiBlock[] = [];
  const charts: ChartData[] = [];
  const hasExplicitKpis = widgets.some((w) => w.value !== null && w.value !== undefined);
  for (const w of widgets ?? []) {
    if (w.value !== null && w.value !== undefined) {
      kpis.push({ key: w.key, label: w.title, value: toNumber(w.value), delta: 0, series: [] });
    }
    if (Array.isArray(w.series) && w.series.length) {
      const chart = rowsToChart(w.key, w.title, w.series, "line");
      if (chart) charts.push(chart);
      if (!hasExplicitKpis) {
        const axisKey = pickAxisKey(w.series);
        numericKeys(w.series, axisKey).forEach((key) =>
          kpis.push(colKpi(KPI_LABELS[key] ?? key, w.series, key))
        );
      }
    }
    if (Array.isArray(w.table) && w.table.length) {
      const chart = rowsToChart(w.key, w.title, w.table, "bar");
      if (chart) charts.push(chart);
      if (!hasExplicitKpis) {
        const axisKey = pickAxisKey(w.table);
        numericKeys(w.table, axisKey).forEach((key) =>
          kpis.push(colKpi(KPI_LABELS[key] ?? key, w.table, key))
        );
      }
    }
  }
  return { kpis, charts, refreshedAt };
}

/** Hàng breakdown: ưu tiên widget table, else series lớn nhất (không có endpoint breakdown riêng). */
function widgetsToRows(widgets: RawWidget[]): Row[] {
  const table = widgets.find((w) => Array.isArray(w.table) && w.table.length);
  if (table?.table) return table.table;
  const series = widgets.find((w) => Array.isArray(w.series) && w.series.length);
  return series?.series ?? [];
}

// -- Query keys -------------------------------------------------------------

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

// -- Real hooks -------------------------------------------------------------

/**
 * Overview = tổng hợp CLIENT-SIDE từ các dashboard domain THẬT ("overview" KHÔNG phải domain BE —
 * DashboardService.DOMAINS không có nó; adminDashboard("overview") sẽ ANALYTICS_EXPORT_NOT_FOUND).
 * revenue ← business.revenue_daily, aiCost ← ai.ai_cost.cost_usd, users/engagement ← community.
 */
export function useAnalyticsOverview(range: DateRange) {
  return useQuery<OverviewResponse, Error>({
    queryKey: analyticsKeys.overview(range),
    queryFn: async () => {
      const [learning, business, ai, community] = await Promise.all([
        fetchDashboard("learning", range),
        fetchDashboard("business", range),
        fetchDashboard("ai", range),
        fetchDashboard("community", range),
      ]);
      const revenueRows = business?.widgets.find((w) => w.key === "revenue_daily")?.series ?? [];
      const aiRows = ai?.widgets.find((w) => w.key === "ai_usage")?.table ?? [];
      const communityRows = community?.widgets.find((w) => w.key === "community_daily")?.series ?? [];
      const widgetValue = (dashboard: RawDashboard, key: string) =>
        toNumber(dashboard.widgets.find((w) => w.key === key)?.value);
      const communitySeries = communityRows.map(
        (row) => toNumber(row.posts) + toNumber(row.comments)
      );
      return {
        users: {
          key: "new_users",
          label: "Người dùng mới",
          value: widgetValue(learning, "new_users"),
          delta: 0,
          series: [],
        },
        revenue: { ...colKpi("Doanh thu", revenueRows, "revenue"), value: widgetValue(business, "total_revenue") },
        engagement: {
          key: "community_interactions",
          label: "Tương tác cộng đồng",
          value: widgetValue(community, "community_interactions"),
          delta: communitySeries[0]
            ? ((communitySeries.at(-1)! - communitySeries[0]) / Math.abs(communitySeries[0])) * 100
            : 0,
          series: communitySeries,
        },
        aiCost: { ...colKpi("Chi phí AI", aiRows, "cost_usd"), value: widgetValue(ai, "ai_cost_usd") },
      };
    },
    staleTime: 60 * 1000,
  });
}

export function useAnalyticsDomain(domain: AnalyticsDomain, range: DateRange) {
  return useQuery<DomainResponse, Error>({
    queryKey: analyticsKeys.domain(domain, range),
    queryFn: async () => {
      const dashboard = await fetchDashboard(domain, range);
      return widgetsToDomainResponse(dashboard.widgets, dashboard.refreshedAt);
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Breakdown suy từ CHÍNH dashboard domain (không có endpoint `/analytics/domains/{domain}/breakdown`
 * ở proxy). Phân trang client-side trên hàng widget table/series. sort: BE chưa hỗ trợ → bỏ qua.
 */
export function useAnalyticsBreakdown(
  domain: AnalyticsDomain,
  range: DateRange,
  page: number,
  pageSize: number,
  sort?: string
) {
  return useQuery<BreakdownResponse, Error>({
    queryKey: analyticsKeys.breakdown(domain, range, page, pageSize, sort),
    queryFn: async () => {
      const rows = widgetsToRows((await fetchDashboard(domain, range)).widgets);
      const start = (page - 1) * pageSize;
      const items: BreakdownRow[] = rows.slice(start, start + pageSize).map((r, i) => ({
        id: (r as BreakdownRow).id ?? String(start + i + 1),
        ...(r as BreakdownRow),
      }));
      return { items, total: rows.length, page, pageSize };
    },
    staleTime: 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// PENDING BE: các endpoint sau CHƯA tồn tại trong AdminAnalyticsProxyController (chỉ có
// /dashboards + /dashboards/{key}). Giữ dữ liệu placeholder tất-định để 2 widget này không vỡ
// khi được cấp quyền; wire thật khi BE bổ sung `/analytics/moderation-stats` +
// `/analytics/contribution-stats`. (Composer gate 2 widget này bằng permission FE
// `analytics.view.moderation`/`.contribution` mà ADMIN không có → thực tế không render cho admin.)
// ---------------------------------------------------------------------------

export function useModerationStats() {
  return useQuery<ModerationStatsResponse, Error>({
    queryKey: analyticsKeys.moderation(),
    queryFn: () =>
      apiClient
        .get<ModerationStatsResponse>("/analytics/moderation-stats")
        .then((r) => r.data),
    staleTime: 60 * 1000,
  });
}

export function useContributionStats(scopeType: string, scopeId: string, range: DateRange) {
  return useQuery<ContributionStatsResponse, Error>({
    queryKey: analyticsKeys.contribution(scopeType, scopeId, range),
    queryFn: () =>
      apiClient
        .get<ContributionStatsResponse>("/analytics/contribution-stats", {
          params: { scopeType, scopeId, from: range.from, to: range.to },
        })
        .then((r) => r.data),
    enabled: !!scopeType && !!scopeId,
    staleTime: 60 * 1000,
  });
}

/**
 * Export CSV dựng client-side từ dashboard domain THẬT (proxy chưa có endpoint
 * `/analytics/domains/{domain}/export`). Xuất trực tiếp hàng widget table/series ra CSV.
 */
export async function exportDomainCsv(domain: AnalyticsDomain, range: DateRange): Promise<Blob> {
  const rows = widgetsToRows((await fetchDashboard(domain, range)).widgets);
  if (!rows.length) {
    return new Blob([`domain,message\n${domain},no data\n`], { type: "text/csv;charset=utf-8;" });
  }
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => escape(r[h])).join(","));
  return new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
}
