# admin-device-oversight-appeals — Màn theo dõi tài khoản dùng chung + hàng đợi đơn xin mở khoá

## Why

BE (`identity-device-ban-appeal`) nay đếm được thiết bị phân biệt theo cửa sổ ngày, khoá được kèm lý
do soạn từ thiết bị thật, và nhận được đơn xin mở khoá. Không có màn hình nào của Admin gọi tới
những endpoint đó ⇒ tính năng tồn tại nhưng **không ai dùng được**: admin vẫn phải đoán trúng người
rồi mới tra thiết bị, và đơn xin mở khoá thì nằm im trong DB không ai nhìn.

## What Changes

- **Trang "Tài khoản dùng chung"** (`/users/devices`): bảng tài khoản đăng nhập từ ≥N thiết bị phân
  biệt trong cửa sổ ngày (mặc định 4/30, chỉnh ngay trên trang), kèm tên thiết bị gần nhất, tag
  **"đã vi phạm N lần"**, trạng thái khoá. Nút **Khoá** có confirm nêu rõ số thiết bị + hệ quả
  (đăng xuất mọi nơi + gửi email), và cảnh báo riêng nếu tài khoản từng bị khoá.
- **Trang "Đơn xin mở khoá"** (`/users/appeals`): hàng đợi lọc theo trạng thái, hiện lời trình bày,
  lý do bị khoá, số lần tái phạm; **Mở khoá** / **Từ chối** kèm ghi chú gửi vào email báo kết quả.
- Cả hai gọi `/api/v1/identity/admin/**` qua `coreClient` (không phải `apiClient` base `/api/v1/admin`).

## Capabilities

### New Capabilities
- `admin-device-oversight`: xem tài khoản vượt ngưỡng thiết bị, khoá theo thiết bị, duyệt đơn mở khoá.

## Impact
- 2 route mới dưới nhóm nav "Hệ thống"; trang danh sách gác bằng `user.session.view` (chỉ đọc), nút
  khoá và trang đơn gác bằng `user.lock`.
- Không đụng màn hình người dùng sẵn có.
