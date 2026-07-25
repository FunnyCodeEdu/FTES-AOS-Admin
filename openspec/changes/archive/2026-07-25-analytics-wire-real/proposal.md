## Why

Cụm Analytics (`src/features/analytics/**`) chạy 100% mock (`MOCK_ENABLED=true` trong `analytics.api.ts`)
+ có GraphQL query `adminDashboard`/`analytics` viết SẴN nhưng SAI: chọn field structured
(`users/revenue/engagement/aiCost`, `kpis/charts`) trong khi schema thật chỉ trả JSON opaque
(`AdminDashboard{domain,widgets:JSON}`, `AnalyticsSeries{domain,data:JSON}`), và dùng sai tên input
`DateRangeInput` (schema là `DateRange`). Ngoài ra GraphQL query CÓ ARG đang dính bug hệ thống "401
by-arg". BE THẬT đọc analytics qua `analyticsQuery.dashboard(...)` pre-aggregated.

## What Changes

- **Bỏ `MOCK_ENABLED` + toàn bộ mock + GraphQL query sai**; wire **REST proxy**
  `/api/v1/admin/analytics/dashboards/{domain}` (guard flat `admin.analytics.read` —
  `AdminAnalyticsProxyController`) để **né bug 401 GraphQL-by-arg** và né schema JSON-opaque.
- **Mapper widget→FE**: BE trả `{ domain, widgets:[{key,title,series|value|table}], refreshedAt }`.
  Helper generic map `series/table` → `ChartData` (line/bar, trục = cột không-số đầu tiên, dataset = cột
  số), `value` + cột số đầu → `KpiBlock` (value=tổng, series=giá trị/hàng, delta=%(cuối vs đầu)).
- **`useAnalyticsDomain`**: đọc thật `/dashboards/{domain}` → `DomainResponse{kpis,charts}`.
- **`useAnalyticsBreakdown`**: suy từ CHÍNH dashboard domain (proxy KHÔNG có
  `/domains/{domain}/breakdown`); phân trang client-side. **`exportDomainCsv`**: dựng CSV client-side từ
  hàng widget thật (proxy chưa có endpoint export).
- **`useAnalyticsOverview`**: "overview" KHÔNG phải domain BE → tổng hợp client-side từ dashboard THẬT
  `business` (revenue), `ai` (aiCost), `community` (users/engagement).
- **`useModerationStats` / `useContributionStats`**: proxy CHƯA có `/analytics/moderation-stats` +
  `/analytics/contribution-stats` → giữ placeholder rỗng (0) + `TODO`; 2 widget này bị composer gate bằng
  permission FE mà ADMIN không có nên thực tế không render.
- **`shared/types.ts` `DOMAIN_NAV_ITEMS`**: đổi permission per-domain `analytics.view.<domain>` (không tồn
  tại trong catalog BE) → leaf thật `admin.analytics.read` để nav/widget domain hiển thị cho ADMIN (đồng
  nhất `DomainDashboardPage`).

## Capabilities

### New Capabilities

- `analytics-console-wire-real`: dashboard analytics per-domain (KPI/chart/breakdown/CSV) + overview đọc
  dữ liệu THẬT qua REST proxy admin; moderation/contribution chờ endpoint BE.

## Impact

- **FE sửa**: chỉ trong `src/features/analytics/**` — `api/analytics.api.ts`, `shared/types.ts`.
- **KHÔNG đụng BE**, không GraphQL schema/Models, không migration, không folder/shared khác.
- **Phụ thuộc grant BE** (change `analytics-admin-grants` / migration V164): REST proxy cần ADMIN có
  `admin.analytics.read`. Trước khi Flyway chạy trên apitest, hook có thể 403.
- Field BE chưa có (moderation/contribution stats, users count riêng, delta pre-computed) → placeholder/
  suy an toàn, không bịa. KHÔNG tsc/build/commit trong change này (theo yêu cầu).
