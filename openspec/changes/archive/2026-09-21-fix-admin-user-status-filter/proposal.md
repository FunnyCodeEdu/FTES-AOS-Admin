# fix-admin-user-status-filter — Sửa hợp đồng trạng thái tài khoản

## Why
Trang `/users` đang giữ giá trị trạng thái dạng UI chữ thường (`active`, `locked`, `pending`) nhưng gửi thẳng sang GraphQL. Backend lưu và lọc theo enum chữ hoa (`ACTIVE`, `LOCKED`, `PENDING_VERIFICATION`, `DISABLED`), vì vậy chọn "Đang hoạt động" trả về danh sách rỗng dù có dữ liệu. Dữ liệu trả về chữ hoa cũng chưa được chuẩn hoá trước khi hiển thị.

## What Changes
- Chuẩn hoá trạng thái UI sang giá trị GraphQL trước khi gửi bộ lọc.
- Chuẩn hoá trạng thái GraphQL về mô hình UI cho danh sách và trang chi tiết.
- Bổ sung trạng thái "Đã vô hiệu hoá" và dùng chung metadata nhãn/màu/options.
- Thêm unit test cho toàn bộ ánh xạ trạng thái và giá trị không xác định.

## Capabilities

### New Capabilities
<!-- Không thêm capability mới. -->

### Modified Capabilities
- `user-directory`: bộ lọc trạng thái phải dùng đúng contract backend và hiển thị nhất quán.
- `user-detail`: trạng thái tài khoản phải được chuẩn hoá trước khi quyết định nhãn và hành động.

## Impact
- Route: `/users`, `/users/:id`.
- Feature: `src/features/users/`.
- API tiêu thụ: GraphQL `adminUsers` và `adminUser`.
- Permission gates giữ nguyên (`user.view`/`admin.user.read`); không thay đổi mutation hay dữ liệu.
