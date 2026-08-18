# admin-security-console

## ADDED Requirements

### Requirement: Trang admin liệt kê tín hiệu cào đề / lạm dụng
Admin có quyền xem nhật ký bảo mật SHALL mở được trang liệt kê các tín hiệu lạm dụng có phân trang,
lọc theo trạng thái mở/đã-xử-lý, mỗi dòng nêu tài khoản, loại, mức độ, số đề khác nhau trong giờ và
thời điểm phát hiện.

Trang SHALL đặt cạnh các màn bảo mật tài khoản hiện có và gác bằng quyền xem, không phải quyền khoá.

#### Scenario: Mở trang báo cáo
- **WHEN** admin có quyền xem nhật ký bảo mật vào trang báo cáo cào đề
- **THEN** trang SHALL hiển thị danh sách tín hiệu có phân trang và lọc theo trạng thái

### Requirement: Đánh dấu đã xử lý không mở khoá tài khoản
Nút đánh dấu đã xử lý SHALL gác bằng quyền khoá tài khoản và SHALL chỉ chuyển tín hiệu sang trạng
thái đã xử lý, KHÔNG mở khoá tài khoản đang bị khoá.

#### Scenario: Đánh dấu một tín hiệu
- **WHEN** admin bấm đánh dấu đã xử lý trên một tín hiệu đang mở
- **THEN** tín hiệu SHALL chuyển sang đã xử lý
- **AND** tài khoản liên quan SHALL KHÔNG được mở khoá bởi thao tác này
