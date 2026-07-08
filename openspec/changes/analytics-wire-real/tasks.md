## 1. Bỏ mock + wire REST proxy (`api/analytics.api.ts`)

- [x] 1.1 Xoá `MOCK_ENABLED`, các hàm `mock*`, GraphQL query `ADMIN_DASHBOARD_QUERY`/`ANALYTICS_QUERY`,
      import `graphqlRequest`/`useAuthStore`.
- [x] 1.2 `fetchDashboard(domain,range)` gọi `apiClient.get('/analytics/dashboards/{domain}',{params:{from,to}})`
      → `{domain,widgets,refreshedAt}` (envelope đã bóc bởi interceptor).
- [x] 1.3 Mapper generic: `rowsToChart` (line/bar), `colKpi`/`primaryKpiFromRows`, `widgetsToDomainResponse`,
      `widgetsToRows`.

## 2. Wire từng hook

- [x] 2.1 `useAnalyticsDomain` → `widgetsToDomainResponse` (REST thật).
- [x] 2.2 `useAnalyticsBreakdown` → suy từ dashboard domain, phân trang client-side.
- [x] 2.3 `useAnalyticsOverview` → tổng hợp từ dashboard business/ai/community THẬT (Promise.all).
- [x] 2.4 `exportDomainCsv` → dựng CSV client-side từ hàng widget thật.
- [x] 2.5 `useModerationStats`/`useContributionStats` → placeholder 0 + `TODO` (chờ endpoint BE).

## 3. Nav permission

- [x] 3.1 `shared/types.ts` `DOMAIN_NAV_ITEMS.permission` → `admin.analytics.read` (leaf thật BE).

## 4. Verify (ngoài phạm vi change này)

- [x] 4.1 Rà không còn tham chiếu mock/graphqlRequest trong `features/analytics/**`; hook giữ nguyên
      signature nên component không đổi.
- [ ] 4.2 tsc/build + E2E apitest (login admin.test, cần V164 đã Flyway) — CHỦ Ý bỏ qua theo yêu cầu.
