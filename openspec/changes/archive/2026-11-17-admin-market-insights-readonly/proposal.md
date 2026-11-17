## Why

Cần báo cáo thị trường chung cho chủ hệ thống và mentor ngoài công ty: hành vi, tính năng, người trả tiền, doanh thu; tài khoản đánh giá chỉ được đọc báo cáo.

## What Changes

- Tab Nghiên cứu thị trường: tổng quan, hành vi/tính năng, sử dụng sau thanh toán, hành trình ẩn danh và doanh thu theo ngày.
- Ghi nhận lượt xem trang, mở tính năng và click bằng sự kiện có cấu trúc, không gửi nội dung form, URL query, token hoặc thông tin thanh toán.
- Quyền analytics.market.view; tài khoản đánh giá có phiên ký riêng chỉ được chấp nhận ở API báo cáo, không có tài khoản/token đăng nhập nghiệp vụ.
- Ghi rõ nguồn, độ trễ, múi giờ và mốc bắt đầu dữ liệu trình duyệt; không tạo lịch sử quá khứ giả.

## Capabilities

### New Capabilities
- `market-insights`: Báo cáo tổng hợp, hành trình giả danh và thu thập hành vi giới hạn.
- `external-reviewer-readonly`: Tài khoản ngoài chỉ xem, không có quyền sửa và không truy cập PII của người dùng.

### Modified Capabilities

Không thay đổi dữ liệu nghiệp vụ hay quyền hiện có.

## Impact

Backend analytics + identity permissions + bộ chặn read-only; FTES-Admin navigation/API/dashboard; FTES-Web telemetry. Migration mới V417. Phát hành qua CI/CD sau duyệt; không đụng thay đổi đang làm dở của user.
