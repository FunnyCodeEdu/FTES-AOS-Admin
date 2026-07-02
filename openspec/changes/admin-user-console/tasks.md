# Tasks — admin-user-console

## 1. Khung feature & routing
- [ ] 1.1 Tạo feature folder `src/features/users/` (pages/api/components) theo convention.
- [ ] 1.2 Khai báo route `/users`, `/users/:id`, `/users/:id/impersonate` vào router,
      guard bằng `user.view` (impersonate guard thêm `user.impersonate`).
- [ ] 1.3 Thêm nav item "Người dùng" gate theo `user.view`.

## 2. API layer
- [ ] 2.1 Viết `src/features/users/api/users.api.ts`: list/detail/learning/transactions/
      sessions/security-log/lock/unlock/reset/revoke/roles/impersonate/export theo design.md.
- [ ] 2.2 Viết `users.keys.ts` với query key factory như design.md mục 4.
- [ ] 2.3 Types: `UserRow`, `UserProfile`, `Session`, `SecurityEvent`, params list.

## 3. Danh sách user (user-directory)
- [ ] 3.1 `UserListPage` + `UserTable`: server-side pagination/sort, cột tên/email/role/
      status/campus/ngày tạo.
- [ ] 3.2 `UserFilters`: search debounce 300ms theo tên/email, filter role/status/campus,
      đồng bộ filter lên URL query string.
- [ ] 3.3 Empty/loading(skeleton)/error state cho bảng.
- [ ] 3.4 `ExportButton` gate `user.export`: confirm → tạo job → poll → tải file.

## 4. User detail (user-detail)
- [ ] 4.1 `UserDetailPage`: header hồ sơ + status badge + hàng action gate theo permission.
- [ ] 4.2 Tab Hồ sơ, Học tập, Giao dịch (kèm link sang commerce), Thiết bị & Session,
      Security log — mỗi tab query riêng, lazy khi active.
- [ ] 4.3 Security log: filter loại sự kiện + khoảng ngày, server-side pagination.

## 5. Hành động tài khoản (user-account-actions)
- [ ] 5.1 `LockUserModal` / unlock: lý do bắt buộc ≥10 ký tự, confirm nêu hệ quả,
      xử lý 403/409/mạng theo Flow A.
- [ ] 5.2 `ResetPasswordModal`: confirm + tuỳ chọn notify user.
- [ ] 5.3 `RevokeSessionsModal`: chọn session hoặc "tất cả", confirm, invalidate sessions+log.

## 6. Đổi role & impersonate
- [ ] 6.1 `ChangeRoleModal` gate `rbac.role.assign` (nút ẩn khi thiếu): multi-select role,
      diff thêm/bỏ, lý do bắt buộc, double-confirm.
- [ ] 6.2 `ImpersonateViewerPage` + `impersonationStore`: token read-only riêng, banner cố
      định, nút thoát, tự thoát khi token hết hạn.

## 7. Verify
- [ ] 7.1 `openspec validate admin-user-console` pass.
- [ ] 7.2 npm run build xanh + tsc --noEmit sạch.
- [ ] 7.3 Test tay: user thiếu từng permission → nút/nav/route ẩn hoặc 403 đúng design.
