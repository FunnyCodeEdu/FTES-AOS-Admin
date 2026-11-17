import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderComponent } from "../../../shared/testing/hookHarness";
import type { MarketOverview } from "./types";

const mocks = vi.hoisted(() => ({ overview: vi.fn(), activity: vi.fn() }));
vi.mock("../../auth/api", () => ({ useMe: () => ({ data: { permissions: ["analytics.market.readonly"] } }) }));
vi.mock("../components/DateRangePicker", () => ({ DateRangePicker: () => <div>DATE_RANGE</div>, useAnalyticsDateRange: () => ({ range: { from: "2026-11-01", to: "2026-11-17" } }) }));
vi.mock("./api", () => ({ useMarketOverview: mocks.overview, useMarketActivity: mocks.activity }));
window.matchMedia ??= ((media: string) => ({ media, matches: false, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false })) as typeof window.matchMedia;
const { default: MarketInsightsPage } = await import("./MarketInsightsPage");

const fixture: MarketOverview = {
  from: "2026-11-01", to: "2026-11-17", cohort: "all", timezone: "Asia/Ho_Chi_Minh", generatedAt: "2026-11-17T01:00:00Z",
  summary: { events: 20, active_users: 5, page_views: 10, browser_visitors: 7, active_paying_users: 2, post_payment_events: 8, server_events: 10, browser_events: 10 },
  revenue: { paid_orders: 3, paying_users: 2, gross_cash_vnd: 250000, refunded_cash_vnd: 50000, net_cash_vnd: 200000, coin_spent: 10, legacy_date_estimates: 1 },
  features: [{ feature: "learning", events: 20, users: 5, visitors: 7, paid_events: 8, paid_users: 2, browser_events: 10, server_events: 10 }],
  daily: [], revenueDaily: [], pages: [], eventTypes: [], payerCoverage: { known_paying_users: 4 },
  coverage: { browser_started_at: null, browser_latest_at: null }, notes: ["TEST_COVERAGE_NOTE"],
};
let mounted: ReturnType<typeof renderComponent> | undefined;
afterEach(() => mounted?.unmount());
beforeEach(() => {
  mocks.overview.mockReset().mockReturnValue({ data: fixture, isLoading: false, isError: false, refetch: vi.fn() });
  mocks.activity.mockReset().mockReturnValue({ data: { items: [], hasMore: false }, refetch: vi.fn() });
});
function view() { mounted = renderComponent(<MarketInsightsPage />); return mounted.container; }
function clickTab(root: HTMLElement, label: string) {
  const tab = [...root.querySelectorAll('[role="tab"]')].find(e => e.textContent === label);
  expect(tab).toBeDefined(); act(() => (tab as HTMLElement).click());
}
describe("market report presentation and drilldown", () => {
  it("labels historical browser gaps honestly and exposes no edit actions", () => {
    const root = view();
    expect(root.textContent).toContain("Chỉ xem báo cáo"); expect(root.textContent).toContain("Chưa có lượt ghé trang/click");
    expect(root.textContent).toContain("TEST_COVERAGE_NOTE");
    expect([...root.querySelectorAll("button")].some(b => /^(Lưu|Xóa|Sửa|Tạo mới)$/.test(b.textContent ?? ""))).toBe(false);
  });
  it("shows retry for query failure without fabricating zero metrics", () => {
    mocks.overview.mockReturnValue({ isError: true, error: new Error("Báo cáo tạm gián đoạn"), refetch: vi.fn() });
    const root = view(); expect(root.textContent).toContain("Chưa tải được báo cáo");
    expect(root.textContent).not.toContain("Tiền thu (VND)");
  });
  it("forces paid cohort for post-payment tab, and only fetches journey on demand", () => {
    const root = view(); expect(mocks.activity.mock.lastCall?.[1]).toBe(false);
    clickTab(root, "Sau thanh toán"); expect(mocks.overview.mock.lastCall?.[0].cohort).toBe("paid");
    clickTab(root, "Hành trình ẩn danh"); expect(mocks.activity.mock.lastCall?.[1]).toBe(true);
  });
  it("drills into a feature without requesting identifying user data", () => {
    const root = view();
    clickTab(root, "Hành vi & tính năng");
    const link = [...root.querySelectorAll("button")].find(b => b.textContent === "Học bài / xem video");
    expect(link).toBeDefined(); act(() => link!.click());
    expect(mocks.activity.mock.lastCall?.[0]).toMatchObject({ feature: "learning", page: 0 });
    expect(mocks.activity.mock.lastCall?.[1]).toBe(true);
  });
});
