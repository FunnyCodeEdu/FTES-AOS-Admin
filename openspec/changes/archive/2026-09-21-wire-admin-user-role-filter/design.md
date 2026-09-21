# Design — wire-admin-user-role-filter

## 1. Route & màn hình

| Route | Thành phần | Thay đổi |
|---|---|---|
| `/users` | `UserListPage`, `UserFilters` | Nạp role catalog, truyền options/loading/error vào dropdown Vai trò. |

## 2. Permission gates

- Danh sách user giữ gate `user.view`/`admin.user.read` hiện tại.
- Catalog role dùng query `rbacRoles`, được backend gate bằng `admin.rbac.read`.
- Nếu caller không có quyền đọc RBAC hoặc query lỗi, danh sách user vẫn hoạt động; riêng dropdown vai trò bị vô hiệu hoá và hiển thị thông báo lỗi, không gây lỗi toàn trang.

## 3. API contract tiêu thụ

| Query | Dữ liệu dùng | Mapping |
|---|---|---|
| `rbacRoles` | `code`, `name` | Option label là `name (code)` khi hai giá trị khác nhau; value luôn là `code`. |
| `adminUsers(filter.role)` | role code | Giá trị URL và GraphQL đều dùng role code, ví dụ `STUDENT`. |

## 4. State & data

- Tái sử dụng `useRoles("", 1, 100)` và cache key `rbac/roles` hiện có.
- Options được memo hoá trong `UserListPage`.
- URL tiếp tục là nguồn chân lý cho filter; đổi role reset về trang 1.
- Không thêm Zustand store.

## 5. Luồng nghiệp vụ chính

1. Trang user tải song song danh sách user và catalog role.
2. Khi role catalog thành công, dropdown hiển thị toàn bộ role theo tên, sắp xếp ổn định.
3. Admin chọn role; URL nhận `role=<CODE>` và query user gửi cùng code đó.
4. Nếu role catalog lỗi, dropdown hiển thị lỗi và bị vô hiệu hoá nhưng bảng user vẫn dùng được.

## 6. UX states

- Loading: spinner trong Select.
- Empty: “Chưa có vai trò”.
- Error/403: “Không thể tải danh sách vai trò”, Select disabled.
- Không có thao tác ghi nên không cần confirm dialog.
