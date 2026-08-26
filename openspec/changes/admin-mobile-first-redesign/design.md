# Design — admin-mobile-first-redesign

## Context

Trang quản trị được dựng cho màn hình rộng nhưng đang được dùng thật trên điện thoại. Đợt trước đã
vá tại chỗ cho hai màn (lương, thêm học viên) bằng `useIsMobile` + `scroll={{x}}`. Đợt này làm phần
còn thiếu: giữ phiên đăng nhập, đưa việc hay làm lên trang chủ, và chuẩn hoá cách mọi danh sách
hành xử trên màn nhỏ.

Nghiên cứu UX tham chiếu (đã đọc khi thiết kế): vùng chạm 44–48px (WCAG 2.2 / Material 3); bảng
trên màn hẹp nên bỏ cột phụ thay vì cuộn ngang; hành động chính đặt trong tầm ngón cái ở đáy, hành
động phá huỷ đặt xa hơn để tạo ma sát có chủ ý; form nhiều trường trên điện thoại nên chiếm trọn
viewport thay vì hộp nổi giữa màn.

## Goals

- Đăng nhập một lần, dùng nhiều ngày — không bị đá ra khi mở lại web hay mở tab mới.
- Ba việc hay làm bấm được trong một chạm từ trang chủ.
- Mọi danh sách chính đọc và thao tác được trên màn 375px mà không cuộn ngang.
- Không đổi hành vi trên desktop.

## Non-goals

- Không viết lại theo thư viện mobile riêng (`antd-mobile`) — giữ antd 5, chỉ đổi cách bày.
- Không đụng backend.
- Không làm PWA / offline.

## Decisions

### 1. Refresh token mặc định vào `localStorage`

`refreshStorage.set(token, remember)` giữ nguyên hai nhánh, nhưng **mặc định của `remember` đổi
thành `true`**: store khởi tạo `remember` là `true` khi chưa có dấu vết lựa chọn nào, và ô tick ở
form đăng nhập mặc định bật.

Cân nhắc đã loại: (a) luôn ghi `localStorage` và bỏ hẳn ô tick — mất đường thoát cho máy dùng chung;
(b) lưu cả access token — không có lợi vì access token sống ngắn và BE đã có cửa refresh GRACE.

Rủi ro: trên máy dùng chung, phiên sống lâu hơn trước. Giảm bằng cách giữ ô tick (bỏ tick = hành vi
cũ) và nói rõ trong nhãn "giữ đăng nhập trên thiết bị này".

### 2. `ResponsiveTable` bọc `Table`, không thay thế

Component nhận đúng props của `Table` cộng `renderMobileCard(record)`. Dưới `md` thì render `List`
thẻ; từ `md` trở lên render `Table` y như cũ. Nhờ vậy trang nào chưa cung cấp `renderMobileCard`
vẫn chạy nguyên trạng — cho phép áp dần, không phải sửa hết trong một commit.

### 3. Lối tắt trang chủ là dữ liệu, không phải JSX chép tay

Danh sách lối tắt khai báo thành mảng `{key, icon, title, hint, to, permissions}` rồi render bằng
một component chung. Quyền dùng đúng cơ chế `<Can>` sẵn có; riêng "Xem lương" chọn đích theo quyền
(`payroll.manage` → `/payroll`, ngược lại `/instructor/earnings`).

### 4. "Thêm học viên" mở modal ngay tại chỗ

Cả trang chủ lẫn thẻ khoá học dùng lại `GrantEnrollmentModal` + `useBulkEnrollPanel` đã có. Từ trang
chủ thì thêm một bước chọn khoá (ô tìm khoá học), rồi vào đúng modal đó — một luồng, một chỗ sửa.

## Risks

- **Chạm nhiều file.** Giảm bằng cách áp `ResponsiveTable` theo thứ tự ưu tiên (khoá học, lương,
  chương trình thưởng, môn học, người dùng) và giữ nguyên trang chưa áp.
- **Hồi quy desktop.** Chốt bằng test đơn vị cho nhánh `isMobile=false` của `ResponsiveTable` và
  `npm run build` + vitest xanh trước khi merge.
