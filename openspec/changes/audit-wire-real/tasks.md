## 1. Wire audit log LIST sang GraphQL (`api/audit.api.ts`)

- [x] 1.1 Bỏ `MOCK_ENABLED` + xoá `mockAuditLog/mockAuditDetail/mockSecurityEvents` + import `apiClient`.
- [x] 1.2 `useAuditLogs` dùng `adminAuditLogs(filter, page)`; map `resourceType→domain/targetType`,
      `actorId→actor.id/fullName`, page 0-based ↔ 1-based.

## 2. Audit log DETAIL từ list-row (`api/audit.api.ts` + `pages/AuditLogPage.tsx`)

- [x] 2.1 Bỏ hook `useAuditLog` (endpoint không tồn tại); thêm helper `auditEntryToDetail(row)` với
      `before/after/metadata/ip = null`.
- [x] 2.2 `AuditLogPage` giữ `selected: AuditEntry` (thay `selectedId`); drawer nhận detail suy từ row.

## 3. Security event LIST per-user (`api/audit.api.ts` + `pages/SecurityLogPage.tsx`)

- [x] 3.1 `useSecurityEvents` dùng `adminUserSecurityLog(userId, page)`, `enabled: !!userId`;
      `device=userAgent`, `metadata=parse(detail)`, `severity` suy từ `type`.
- [x] 3.2 `SecurityLogPage` đổi sang input **User ID** bắt buộc; bỏ filter type/ngày; empty-state khi chưa nhập.

## 4. Verify (ngoài phạm vi change này)

- [x] 4.1 Smoke: 3 module audit import sạch qua Vite (không lỗi export/compile).
- [ ] 4.2 tsc/build + E2E apitest (login thật) — CHỦ Ý bỏ qua theo yêu cầu; chạy khi tích hợp.

## Nghiệm thu E2E 2026-07-23
- BLOCKED-ADMIN-CREDS: kịch bản cần đăng nhập ADMIN vào CMS; mật khẩu admin.test đã xoay 2026-07-21 (/root/.ftes-test-credentials trên box apitest), máy local không SSH tới box. Điều kiện mở khoá: cấp lại mật khẩu admin.test hoặc chạy trên server.
