# admin-analytics-audit — Dashboard analytics theo tầng + Audit/Security log

## Why

Trang chủ `/` của admin mới chưa có nội dung; mỗi tầng quyền (Super Admin / Admin mảng /
Moderator / CTV — theo `docs/ADMIN-ARCHITECTURE.md`) cần thấy dashboard đúng phạm vi của mình
ngay khi đăng nhập thay vì một trang chung chung. Đồng thời hệ thống RBAC + các mutation nguy
hiểm đã yêu cầu "mọi hành động ghi audit" — nhưng chưa có UI để đọc audit log và security log
(đăng nhập bất thường, khoá account, đổi quyền). Audit log phải bất biến: UI chỉ đọc, không có
bất kỳ mutation nào.

## What Changes

- Dashboard `/` render theo tầng quyền: Super Admin thấy tổng quan mọi mảng (users, revenue,
  engagement, AI cost); Admin mảng thấy dashboard mảng mình; Moderator thấy queue stats;
  CTV thấy contribution stats trong scope.
- Các dashboard domain: Learning, Subject, Community, AI, Gamification, Business — chart +
  date range picker + export CSV, gate theo `analytics.view.<domain>`.
- Audit Log viewer `/system/audit`: filter theo actor/action/domain/thời gian, detail diff
  before/after, hoàn toàn chỉ đọc (immutable).
- Security log viewer: login bất thường, account lock, thay đổi quyền — gate riêng.

## Capabilities

### New Capabilities

- `analytics-tiered-dashboard`: dashboard trang chủ hiển thị theo tầng quyền và scope.
- `analytics-domain-dashboards`: dashboard chi tiết từng domain với chart, date range, export CSV.
- `audit-log-viewer`: xem audit log bất biến với filter + diff before/after.
- `security-log-viewer`: xem security event (login bất thường, lock, đổi quyền).

### Modified Capabilities

Không sửa capability nào hiện có.

## Impact

- Route: `/` (dashboard — đã có placeholder từ `admin-foundation`, nay có nội dung),
  `/analytics/:domain`, `/system/audit`, `/system/security-log`.
- Feature folder mới: `src/features/analytics/`, `src/features/audit/`.
- API BE tiêu thụ: `/api/v1/admin/analytics/...`, `/api/v1/admin/audit/...`
  (assumption đánh dấu trong design.md).
- Permission gates: `analytics.view.overview`, `analytics.view.<domain>` (learning/subject/
  community/ai/gamification/business), `analytics.view.moderation`, `analytics.view.contribution`
  (CTV scoped), `audit.view`, `security.log.view`.
