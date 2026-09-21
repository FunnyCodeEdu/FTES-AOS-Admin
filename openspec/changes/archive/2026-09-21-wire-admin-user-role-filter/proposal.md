# wire-admin-user-role-filter — Nối bộ lọc vai trò người dùng

## Why
Trang `/users` đã render ô chọn “Vai trò” và đã gửi `role` sang backend, nhưng không nạp hay truyền `roleOptions` cho `UserFilters`. Vì vậy dropdown luôn rỗng và admin không thể chọn vai trò để lọc.

## What Changes
- Nạp catalog vai trò thật từ GraphQL `rbacRoles` trên trang danh sách user.
- Chuyển catalog thành options có nhãn dễ đọc và giá trị là `role.code` đúng contract `AdminUserFilter.role`.
- Hiển thị loading/error/empty state rõ ràng trong dropdown.
- Thêm unit test cho việc tạo options, sắp xếp và loại mã trùng.

## Capabilities

### New Capabilities
<!-- Không thêm capability mới. -->

### Modified Capabilities
- `user-directory`: bộ lọc vai trò có danh sách lựa chọn thật và gửi đúng role code.

## Impact
- Route: `/users`.
- Feature: `src/features/users/` và read hook hiện có tại `src/features/rbac/api`.
- API: GraphQL `rbacRoles` và `adminUsers`.
- Không thay đổi mutation hoặc dữ liệu tài khoản.
