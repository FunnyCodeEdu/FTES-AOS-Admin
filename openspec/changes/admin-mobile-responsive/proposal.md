## Why

Admin dùng trên điện thoại rất khó, nhất là hai việc hay làm khi đang di chuyển: **thêm học viên vào
khoá** và **xem lương**. Cụ thể: sider cố định vẫn ăn 80px bề ngang; breadcrumb chiếm gần hết header;
bảng nhiều cột đẩy vỡ layout; modal/drawer cố định 520/720px để lại mép trống mà nội dung thì chật.

## What Changes

- `useIsMobile()` (bọc `Grid.useBreakpoint`, mốc `md`) — dùng CHUNG, không tự nghe matchMedia để không
  lệch mốc với `Row/Col`. Chỉ trả `true` khi đã đo xong, tránh giật một nhịp trên máy bàn.
- **Khung admin**: mobile bỏ sider cố định → menu vào `Drawer` mở bằng chính nút hamburger, chọn mục
  xong tự đóng; nội dung tràn hết bề ngang (`marginLeft: 0`), padding 12, header thay breadcrumb bằng
  tên trang (ellipsis).
- **Xem lương**: bảng `scroll x` + `size small` + phân trang `simple`; ô tìm/lọc full width; drawer chi
  tiết `width 100%` và `Descriptions` 1 cột.
- **Thêm học viên**: ô tìm full width; bảng roster `scroll x` và BỎ cột User ID trên mobile (uuid dài,
  không đọc bằng mắt); modal "Thêm học viên" và "Cấp học viên" rộng 96vw, đẩy sát mép trên để bàn phím
  không che ô dán username.
- Bảng danh sách khoá `scroll x` (hàng thao tác 4 nút rộng hơn màn hình).

## Capabilities

### Modified Capabilities

- `admin-shell`: dùng được trên điện thoại — menu dạng drawer, bảng cuộn ngang, modal/drawer vừa màn.
