# Tasks — admin-analytics-audit

## 1. Khung feature & API layer

- [x] 1.1 Tạo feature folder `src/features/analytics/` và `src/features/audit/`
      (pages + api + components).
- [x] 1.2 API modules: `analytics.api.ts` (overview, domain, breakdown, export, moderation-stats,
      contribution-stats), `audit.api.ts` (logs, log detail, security-events) — typed, envelope;
      KHÔNG khai báo bất kỳ hàm mutation nào cho audit/security.
- [x] 1.3 Query hooks + keys theo design.md; date range đọc/ghi URL search params, default 30 ngày.
- [x] 1.4 Đăng ký route `/analytics/:domain`, `/system/audit`, `/system/security-log` với guard
      (`analytics.view.<domain>`, `audit.view`, `security.log.view`); nav items gated theo quyền.

## 2. Dashboard theo tầng (`/`)

- [x] 2.1 `DashboardComposer` — map permission list → danh sách widget, sắp thứ tự ưu tiên;
      fallback welcome card khi không có permission analytics nào.
- [x] 2.2 Widget Super Admin: 4 KPI card (users/revenue/engagement/AI cost) + sparkline
      (`analytics.view.overview`).
- [x] 2.3 Widget domain (learning/subject/community/ai/gamification/business) — KPI + mini chart +
      link sang `/analytics/:domain`, mỗi widget query độc lập + error card cục bộ.
- [x] 2.4 Widget Moderator queue stats (`analytics.view.moderation`).
- [x] 2.5 Widget CTV contribution (`analytics.view.contribution`) — scoped: tự gắn scope từ grants,
      scope picker khi nhiều scope (tái dùng `useCtvScopeStore`).

## 3. Domain dashboards

- [x] 3.1 `DomainDashboardPage` (`/analytics/:domain`) — validate param domain, 403 khi thiếu
      permission tương ứng.
- [x] 3.2 Header: date range picker (preset 7/30/90 + custom) sync URL; body: charts
      `@ant-design/charts` render từ `ChartData[]`.
- [x] 3.3 Bảng breakdown server-side pagination/sort.
- [x] 3.4 Export CSV: nút gate `analytics.export`, fetch blob + download, loading/error states.

## 4. Audit log viewer

- [x] 4.1 `AuditLogPage` (`/system/audit`) — bảng chỉ đọc server-side pagination; filter actor
      (user search autocomplete), action, domain, khoảng thờii gian; filter sync URL.
- [x] 4.2 `AuditDetailDrawer` — metadata + diff before/after highlight field thay đổi; not-found
      state khi id sai.
- [x] 4.3 Đảm bảo immutable: không render affordance sửa/xoá; test route không có mutation.

## 5. Security log viewer

- [x] 5.1 `SecurityLogPage` (`/system/security-log`) — bảng chỉ đọc, filter type/user/thờii gian,
      drawer detail (IP/device), link điều hướng sang `/users/:id`.

## 6. Verify

- [x] 6.1 `npm run build` xanh + `tsc --noEmit` sạch.
- [x] 6.2 Smoke test: login 4 account (Super Admin / admin mảng / Moderator / CTV) xác nhận `/`
      render đúng widget từng tầng; truy cập chéo `/analytics/:domain` và `/system/audit` bằng
      account thiếu quyền → 403 kèm permission thiếu.
