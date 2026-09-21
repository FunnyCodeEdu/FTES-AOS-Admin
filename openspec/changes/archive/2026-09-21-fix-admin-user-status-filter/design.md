# Design — fix-admin-user-status-filter

## 1. Route & màn hình

| Route | Thành phần | Thay đổi |
|---|---|---|
| `/users` | `UserListPage`, `UserFilters`, `UserTable` | Map trạng thái UI ↔ GraphQL; thêm lựa chọn DISABLED; dùng chung nhãn/màu. |
| `/users/:id` | `UserDetailPage` | Hiển thị nhãn/màu từ metadata đã chuẩn hoá. |

## 2. Permission gates

Không đổi permission. Route và navigation tiếp tục được gate bằng permission hiện hành. Thay đổi chỉ ở dữ liệu đọc; CTV ngoài scope và admin thiếu quyền vẫn nhận hành vi 403 hiện tại.

## 3. API contract tiêu thụ

| Operation | Contract | Quyền | Mapping |
|---|---|---|---|
| Query user list | GraphQL `adminUsers(filter: AdminUserFilter, page: PageInput)` | `admin.user.read` | `active→ACTIVE`, `locked→LOCKED`, `pending→PENDING_VERIFICATION`, `disabled→DISABLED`. |
| Query user detail | GraphQL `adminUser(id: ID!)` | `admin.user.read` | Giá trị backend được map ngược về status UI trước khi trả cho component. |

Response GraphQL hiện trả `status: String!`; các giá trị nguồn là enum tài khoản backend. Giá trị lạ được giữ ở dạng chữ thường để UI không che mất contract mới.

## 4. State & data

- TanStack Query keys giữ nguyên.
- URL tiếp tục lưu giá trị UI chữ thường để link dễ đọc và tương thích link cũ.
- Mapper thuần đặt tại feature users, dùng chung cho API, filter, bảng và detail.
- Không thêm Zustand store và không thay đổi invalidation.

## 5. Luồng nghiệp vụ chính

1. Admin chọn một trạng thái; URL cập nhật và reset về trang 1.
2. API mapper chuyển status URL sang giá trị backend rồi gửi GraphQL.
3. Response được map ngược về status UI trước khi render.
4. Khi backend trả trạng thái mới chưa biết, UI vẫn hiển thị giá trị đó bằng nhãn mặc định thay vì gán nhầm "Đang hoạt động".

## 6. UX states

Loading, empty và error state giữ nguyên. Empty state chỉ xuất hiện khi backend thực sự không có bản ghi phù hợp. Đây là read-only flow nên không có confirm dialog.
