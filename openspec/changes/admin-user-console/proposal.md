# admin-user-console — Console quản trị người dùng

## Why

Admin cũ chỉ có 2 role và màn quản user rất thô (list + khoá tay, không audit, không
session/security view). Theo mô hình 4 tầng quyền trong `docs/ADMIN-ARCHITECTURE.md`,
mảng `admin-users` cần một console riêng tại `/users/*`, gate hoàn toàn theo permission
leaf (`user.*`), phục vụ: tra cứu nhanh user khi hỗ trợ vận hành, xử lý sự cố bảo mật
(khoá tài khoản, thu hồi session, ép đổi mật khẩu), điều chỉnh role (chỉ khi có quyền
RBAC tương ứng), và điều tra hành vi qua security log + impersonate read-only
(chỉ Super Admin).

## What Changes

- Thêm route nhóm `/users/*` với danh sách user: server-side pagination/sort/filter,
  search theo tên/email, filter theo role/status/campus, export danh sách.
- Thêm trang user detail dạng tab: hồ sơ, tóm tắt học tập, tóm tắt giao dịch,
  thiết bị & session đang hoạt động, security log.
- Thêm nhóm hành động tài khoản: lock/unlock (bắt buộc nêu lý do), force reset
  password, revoke session — tất cả có confirm dialog + ghi audit log.
- Thêm luồng đổi role: chỉ hiển thị khi caller có quyền `rbac.role.assign`;
  không có quyền thì nút ẩn hoàn toàn.
- Thêm impersonate read-only: xem hệ thống như user đích, mọi mutation bị chặn,
  chỉ Super Admin (`user.impersonate`) thấy và dùng được.
- Feature folder mới `src/features/users/` (pages + api + components).

## Capabilities

### New Capabilities

- `user-directory`: danh sách user server-side (search/filter/sort/pagination) + export.
- `user-detail`: trang chi tiết user — hồ sơ, học tập, giao dịch tóm tắt, thiết bị & session, security log.
- `user-account-actions`: lock/unlock có lý do, force reset password, revoke sessions — confirm + audit.
- `user-role-assignment`: đổi role của user, gate theo quyền RBAC, nút ẩn khi thiếu quyền.
- `user-impersonation`: chế độ xem-như-user read-only dành riêng Super Admin.

### Modified Capabilities

- Không sửa capability nào hiện có (console mới hoàn toàn).

## Impact

- Route mới: `/users`, `/users/:id`, `/users/:id/impersonate` — nav item "Người dùng"
  chỉ hiện khi có `user.view`.
- Feature folder: `src/features/users/` (UserListPage, UserDetailPage, ImpersonateViewer,
  api client, components bảng/tab/modal).
- API BE tiêu thụ: `/api/v1/admin/users*` (list, detail, lock, unlock, reset-password,
  sessions, security-log, roles, impersonate, export) — một số endpoint đánh dấu
  assumption trong design.md vì BE `admin-api` chưa chốt spec chi tiết.
- Permission gates: `user.view`, `user.export`, `user.lock`, `user.reset_password`,
  `user.session_revoke`, `rbac.role.assign`, `user.impersonate`.
