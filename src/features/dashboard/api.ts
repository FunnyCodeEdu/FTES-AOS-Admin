import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../shared/api/client";

// Dashboard tổng quan lấy từ analytics dashboards THẬT của BE
// (GET /api/v1/admin/analytics/dashboards -> string[] domain;
//  GET /api/v1/admin/analytics/dashboards/{domain} -> { domain, widgets:[{key,title,series,value,table}] }).
// BE cũ /admin/dashboard/widgets (widget-registry) KHÔNG tồn tại (404) — dùng analytics shape.

export type WidgetKind = "stat" | "chart" | "list";

export interface DashboardWidget {
  key: string; // "<domain>:<widgetKey>" — duy nhất
  domain: string;
  title: string;
  kind: WidgetKind;
  value: number | null;
  series: Array<Record<string, unknown>>;
  table: Array<Record<string, unknown>>;
}

interface RawWidget {
  key: string;
  title: string;
  series: Array<Record<string, unknown>> | null;
  value: unknown;
  table: Array<Record<string, unknown>> | null;
}
interface RawDashboard {
  domain: string;
  widgets: RawWidget[];
  refreshedAt?: string;
}

function toNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function kindOf(w: RawWidget): WidgetKind {
  if (w.value !== null && w.value !== undefined) return "stat";
  if (Array.isArray(w.series) && w.series.length > 0) return "chart";
  return "list";
}

/** Tổng cột số đầu tiên (bỏ cột ngày) của các hàng — dùng cho stat của widget chart/table. */
export function sumPrimaryNumeric(rows: Array<Record<string, unknown>>): number {
  if (!rows.length) return 0;
  const first = rows[0];
  const numCol = Object.keys(first).find(
    (k) => !/^d$|date|day|_at$/i.test(k) && first[k] !== null && !Number.isNaN(Number(first[k]))
  );
  if (!numCol) return 0;
  return rows.reduce((acc, r) => acc + toNumber(r[numCol]), 0);
}

export function useDashboardWidgets() {
  return useQuery<DashboardWidget[], Error>({
    queryKey: ["dashboard", "widgets"],
    queryFn: async () => {
      const domainsRes = await apiClient.get<string[]>("/analytics/dashboards");
      const domains = Array.isArray(domainsRes.data) ? domainsRes.data : [];
      const boards = await Promise.all(
        domains.map((d) =>
          apiClient
            .get<RawDashboard>(`/analytics/dashboards/${d}`)
            .then((r) => r.data)
            .catch(() => null)
        )
      );
      const widgets: DashboardWidget[] = [];
      for (const b of boards) {
        if (!b) continue;
        for (const w of b.widgets ?? []) {
          widgets.push({
            key: `${b.domain}:${w.key}`,
            domain: b.domain,
            title: w.title,
            kind: kindOf(w),
            value: w.value === null || w.value === undefined ? null : toNumber(w.value),
            series: Array.isArray(w.series) ? w.series : [],
            table: Array.isArray(w.table) ? w.table : [],
          });
        }
      }
      return widgets;
    },
    staleTime: 5 * 60 * 1000,
  });
}
