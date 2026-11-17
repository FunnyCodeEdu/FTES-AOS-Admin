export type MarketCohort = "all" | "paid" | "free";
export interface MarketRange { from: string; to: string; cohort: MarketCohort }
export interface MarketSummary {
  events: number; active_users: number; page_views: number; browser_visitors: number;
  active_paying_users: number; post_payment_events: number; server_events: number; browser_events: number;
}
export interface MarketFeatureRow {
  feature: string; events: number; users: number; visitors: number; paid_events: number;
  paid_users: number; browser_events: number; server_events: number;
}
export interface MarketDaily { day: string; events: number; users: number; page_views: number; paid_users: number }
export interface RevenueDaily { day: string; orders: number; gross_cash_vnd: number; refunded_cash_vnd: number; net_cash_vnd: number }
export interface MarketRevenue {
  paid_orders: number; paying_users: number; gross_cash_vnd: number; refunded_cash_vnd: number;
  net_cash_vnd: number; coin_spent: number; legacy_date_estimates: number;
}
export interface MarketOverview extends MarketRange {
  timezone: string; generatedAt: string; summary: MarketSummary; revenue: MarketRevenue;
  features: MarketFeatureRow[]; daily: MarketDaily[]; revenueDaily: RevenueDaily[];
  pages: Array<{ route: string; feature: string; views: number; visitors: number }>;
  eventTypes: Array<{ event_type: string; source: string; events: number; users: number }>;
  payerCoverage: { known_paying_users: number };
  coverage: { browser_started_at: string | null; browser_latest_at: string | null };
  notes: string[];
}
export interface MarketActivityRow {
  event_key: string;
  visitor_key: string; event_type: string; feature: string; route: string | null;
  source: string; occurred_at: string; paid_at_event: boolean;
}
export interface MarketActivityPage { items: MarketActivityRow[]; page: number; size: number; hasMore: boolean }
export interface MarketActivityParams extends MarketRange { visitorKey?: string; feature?: string; page: number }
