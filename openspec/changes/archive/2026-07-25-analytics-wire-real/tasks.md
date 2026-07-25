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
- [x] 4.2 E2E apitest 2026-07-25 PASS (login admin.test, dashboards business/ai/community 200, hết 403).

## Nghiệm thu E2E 2026-07-23
- BLOCKED-ADMIN-CREDS: kịch bản cần đăng nhập ADMIN vào CMS; mật khẩu admin.test đã xoay 2026-07-21 (/root/.ftes-test-credentials trên box apitest), máy local không SSH tới box. Điều kiện mở khoá: cấp lại mật khẩu admin.test hoặc chạy trên server.

## Nghiệm thu E2E 2026-07-25 (CÓ creds admin — PASS)
- Đăng nhập admin.test vào CMS (localhost:5173 → apitest). Trang chủ analytics render 6 domain
  (Học tập / Môn học / Cộng đồng / AI / Gamification / Kinh doanh) + Moderation queue, KHÔNG 403.
- REST thật: `GET /analytics/dashboards/{business,ai,community}` → 200 với `{domain,widgets,
  refreshedAt}` (business: total_revenue + revenue_daily; ai: ai_cost table; community:
  community_daily). Số bằng 0 vì apitest chưa có dữ liệu doanh thu — KHÔNG phải mock.
- ⇒ lớp bug userId của `AnalyticsAccess` đã hết: admin không còn 403. Box 4.2 đóng.
