# admin-auth-session

## MODIFIED Requirements

### Requirement: Giữ phiên đăng nhập trên thiết bị

Phiên đăng nhập SHALL sống sót qua việc tải lại trang, đóng tab và mở tab mới trên cùng thiết bị,
cho tới khi refresh token hết hạn hoặc người dùng đăng xuất.

Lý do đổi: refresh token trước đây lưu `sessionStorage` khi ô "Ghi nhớ đăng nhập" không được tick —
mà ô đó mặc định KHÔNG tick. `sessionStorage` chết theo tab, nên mở link ở tab mới hoặc bị hệ điều
hành thu hồi tab nền là mất phiên và phải đăng nhập lại.

#### Scenario: Mở lại web sau khi đóng tab

- **WHEN** người dùng đã đăng nhập, đóng tab, rồi mở lại trang quản trị
- **THEN** phiên được khôi phục bằng refresh token đang lưu và vào thẳng trang quản trị
- **AND** KHÔNG hiện lại form đăng nhập

#### Scenario: Mở trang quản trị ở tab thứ hai

- **WHEN** người dùng đang đăng nhập ở một tab và mở trang quản trị ở tab mới
- **THEN** tab mới dùng lại phiên đó, không bắt đăng nhập lần hai

#### Scenario: Người dùng chủ động không ghi nhớ

- **WHEN** người dùng bỏ tick ô giữ đăng nhập lúc đăng nhập
- **THEN** refresh token chỉ lưu trong phạm vi tab (`sessionStorage`) và mất khi đóng tab

#### Scenario: Refresh token hỏng thì mới bắt đăng nhập lại

- **WHEN** khôi phục phiên lúc mở app mà BE từ chối refresh token
- **THEN** xoá phiên và chuyển tới trang đăng nhập
