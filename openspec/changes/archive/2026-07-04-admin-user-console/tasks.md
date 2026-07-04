# Tasks — admin-user-console

## 1. Khung feature & routing
- [x] 1.1 Tạo feature folder `src/features/users/` (pages/api/components) theo convention.
- [x] 1.2 Khai báo route `/users`, `/users/:id`, `/users/:id/impersonate` vào router,
      guard bằng `user.view` (impersonate guard thêm `user.impersonate`).
- [x] 1.3 Thêm nav item "Người dùng" gate theo `user.view`.

## 2. API layer
- [x] 2.1 Viết `src/features/users/api/users.api.ts`: list/detail/learning/transactions/
      sessions/security-log/lock/unlock/reset/revoke/roles/impersonate/export theo design.md.
- [x] 2.2 Viết `users.keys.ts` với query key factory như design.md mục 4.
- [x] 2.3 Types: `UserRow`, `UserProfile`, `Session`, `SecurityEvent`, params list.

## 3. Danh sách user (user-directory)
- [x] 3.1 `UserListPage` + `UserTable`: server-side pagination/sort, cột tên/email/role/
      status/campus/ngày tạo.
- [x] 3.2 `UserFilters`: search debounce 300ms theo tên/email, filter role/status/campus,
      đồng bộ filter lên URL query string.
- [x] 3.3 Empty/loading(skeleton)/error state cho bảng.
- [x] 3.4 `ExportButton` gate `user.export`: confirm → tạo job → poll → tải file.

## 4. User detail (user-detail)
- [x] 4.1 `UserDetailPage`: header hồ sơ + status badge + hàng action gate theo permission.
- [x] 4.2 Tab Hồ sơ, Học tập, Giao dịch (kèm link sang commerce), Thiết bị & Session,
      Security log — mỗi tab query riêng, lazy khi active.
- [x] 4.3 Security log: filter loại sự kiện + khoảng ngày, server-side pagination.

## 5. Hành động tài khoản (user-account-actions)
- [x] 5.1 `LockUserModal` / unlock: lý do bắt buộc ≥10 ký tự, confirm nêu hệ quả,
      xử lý 403/409/mạng theo Flow A.
- [x] 5.2 `ResetPasswordModal`: confirm + tuỳ chọn notify user.
- [x] 5.3 `RevokeSessionsModal`: chọn session hoặc "tất cả", confirm, invalidate sessions+log.

## 6. Đổi role & impersonate
- [x] 6.1 `ChangeRoleModal` gate `rbac.role.assign` (nút ẩn khi thiếu): multi-select role,
      diff thêm/bỏ, lý do bắt buộc, double-confirm.
- [x] 6.2 `ImpersonateViewerPage` + `impersonationStore`: token read-only riêng, banner cố
      định, nút thoát, tự thoát khi token hết hạn.

## 7. Verify
- [x] 7.1 `openspec validate admin-user-console` pass.
- [x] 7.2 npm run build xanh + tsc --noEmit sạch.
- [x] 7.3 Test tay: user thiếu từng permission → nút/nav/route ẩn hoặc 403 đúng design (`scripts/smoke/user-console.mjs`).
