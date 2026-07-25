## Why

Cụm Audit (`src/features/audit/**`) đang chạy 100% mock (`MOCK_ENABLED=true` trong
`audit.api.ts`). BE THỰC TẾ đã có read:

- Audit log LIST: GraphQL `adminAuditLogs(filter, page)` (guard `admin.audit.read`) — CHẠY, list 200.
- Security log: chỉ có GraphQL `adminUserSecurityLog(userId, page)` (guard `admin.user.security-log`)
  — theo TỪNG user, KHÔNG có list global.
- KHÔNG có audit **detail-by-id** (REST `/admin/audit/logs/{id}` không tồn tại; by-id GraphQL bug 401).
- KHÔNG có security-events **list global**.

Bỏ mock, wire dữ liệu thật; phần BE chưa có thì chọn hướng khả thi FE-side để né build.

## What Changes

- **Audit log LIST** (`useAuditLogs`): bỏ `MOCK_ENABLED`, dùng GraphQL `adminAuditLogs`. Map shape thật
  `AdminAuditLog {id, actorId, action, resourceType, resourceId, occurredAt}`. BE không có tên/email
  actor → `actor.fullName = actorId` (label), `email = undefined`; `domain/targetType = resourceType`.
- **Audit log DETAIL**: bỏ hook `useAuditLog` (gọi endpoint không tồn tại). Drawer mở bằng ĐÚNG list-row
  đã có; helper `auditEntryToDetail(row)` dựng `AuditEntryDetail` với `before/after/metadata/ip = null`
  (dữ liệu thật không có diff → drawer hiển thị "Không có dữ liệu thay đổi"). Né build, không cần BE mới.
- **Security event LIST** (`useSecurityEvents`): BE chỉ có per-user → `SecurityLogPage` đổi sang **yêu cầu
  User ID**. Wire GraphQL `adminUserSecurityLog`; query chỉ chạy khi có `userId` (`enabled: !!userId`).
  Map `AdminSecurityEvent {id, type, timestamp, ip, userAgent, detail}` → `device = userAgent`,
  `metadata = parse(detail)`, `severity` SUY từ `type` (ANOMALY/LOCK→high, MFA/SESSION/DEVICE→medium,
  else low) vì view thật không có severity. Bỏ filter type/khoảng-ngày (per-user query không hỗ trợ).
- Xoá toàn bộ mock (`mockAuditLog/mockAuditDetail/mockSecurityEvents`, `MOCK_ENABLED`, import `apiClient`).

## Capabilities

### New Capabilities

- `audit-console`: audit log list/detail + security event list đọc dữ liệu thật qua GraphQL admin gateway.

## Impact

- **FE sửa**: chỉ trong `src/features/audit/**` — `api/audit.api.ts`, `pages/AuditLogPage.tsx`,
  `pages/SecurityLogPage.tsx`.
- **KHÔNG đụng BE** (không schema.graphqls/Models/controller mới), không migration, không folder khác.
- Field BE chưa expose (actor name/email, audit diff, security severity) → suy/label an toàn, không bịa.
- KHÔNG tsc/build/commit trong change này (theo yêu cầu). Đã smoke qua Vite: 3 module audit import sạch.
