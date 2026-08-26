## Why

Trang quản trị đang được dùng THẬT trên điện thoại (mentor cấp học viên vào khoá, xem lương, sửa
giá khoá), nhưng nó được dựng cho màn hình rộng. Ba vấn đề đo được:

1. **Mất phiên mỗi lần vào lại web.** `refreshStorage.set` ghi refresh token vào `sessionStorage`
   khi ô "Ghi nhớ đăng nhập" không tick — mà ô đó **mặc định không tick**. `sessionStorage` chết
   theo tab: đóng tab, mở link ở tab mới, hoặc iOS/Android thu hồi tab nền là mất token → `App`
   không có gì để refresh → `PermissionRoute` đá về `/login`. Đây chính là "phải đăng nhập 2 lần"
   (lần một ở tab cũ, lần hai ở tab mới) và "vào lại web là bị out". BE không có lỗi: refresh TTL
   30 ngày, rotation có cửa GRACE.
2. **Việc hay làm bị chôn.** Ba việc chiếm gần hết thời gian của mentor — thêm học viên, xem lương,
   quản lí khoá — nằm rải ở 3 nhánh nav khác nhau, trên điện thoại phải mở Drawer rồi cuộn tìm.
   Trang chủ hiện chỉ có lưới widget thống kê, không có lối tắt nào.
3. **Component dựng cho chuột.** Bảng antd mặc định, nút `size="small"`, ô lọc rộng cố định — trên
   màn 375px thì chữ vỡ dòng, nút nhỏ hơn vùng chạm 44px, và muốn bấm "Thêm học viên" phải cuộn
   ngang qua 4 cột.

## What Changes

- **Giữ phiên**: refresh token mặc định lưu `localStorage` (ô "Ghi nhớ" mặc định TICK, đổi nhãn cho
  đúng nghĩa "giữ đăng nhập trên thiết bị này"). Không tick = hành vi cũ (`sessionStorage`).
- **Trang chủ**: khối "Việc hay làm" đặt TRÊN lưới widget — 3 thẻ lớn, mỗi thẻ một việc, gate theo
  quyền, trên điện thoại xếp dọc full-width, cao ≥ 88px.
  - *Thêm học viên vào khoá* → mở thẳng luồng chọn khoá + dán username.
  - *Xem lương* → `/payroll` nếu có `payroll.manage`, không thì `/instructor/earnings`.
  - *Quản lí khoá học* → `/academic/courses`.
- **Trang khoá học trên điện thoại**: ô tìm to (`size="large"`), bảng đổi thành **danh sách thẻ**,
  mỗi thẻ có nút **Thêm học viên** đứng ĐẦU hàng thao tác, full-width.
- **Bộ component responsive dùng chung**: `ResponsiveTable` (bảng ↔ thẻ), `PageHeader`,
  `FilterBar`, `useResponsiveModal`, cùng cỡ điều khiển `large` trên điện thoại — áp cho các trang
  chính (khoá học, lương, chương trình thưởng, môn học, người dùng, kho challenge, duyệt học liệu).

## Capabilities

### New Capabilities
- `admin-mobile-ux`: Trang quản trị dùng được bằng một ngón tay trên điện thoại — lối tắt việc hay
  làm ở trang chủ, danh sách dạng thẻ, vùng chạm đủ lớn, và bộ primitive responsive dùng chung.

### Modified Capabilities
- `admin-auth-session`: Phiên phải sống qua việc đóng tab / mở tab mới trên cùng thiết bị.
- `admin-dashboard-home`: Trang chủ có khối lối tắt "Việc hay làm" đặt trên lưới widget.
- `academic-course-console`: Danh sách khoá học có dạng thẻ cho điện thoại, nút thêm học viên đứng đầu.

## Impact

- `src/features/auth/store.ts`, `src/features/auth/LoginPage.tsx` — nơi phiên bị vứt đi.
- `src/features/dashboard/DashboardPage.tsx` + component lối tắt mới.
- `src/features/academic/courses/**` — trang danh sách khoá, luồng thêm học viên.
- `src/shared/components/**` — primitive responsive mới (dùng lại `useIsMobile` đã có).
- `src/features/payroll/**`, `src/features/campaigns/**`, và các trang danh sách chính.
- KHÔNG đụng backend: mọi thay đổi nằm ở FE admin.
