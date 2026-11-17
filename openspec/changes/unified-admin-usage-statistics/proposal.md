## Why
Người quản trị muốn thống kê mức dùng từng tính năng nằm trong dashboard quản trị chung. Tài khoản quản trị và mentor dùng cùng trang đăng nhập; mentor chỉ được xem thống kê, tài khoản quản trị giữ đầy đủ quyền hiện có. Nhãn hoàn tiền cần giải thích rõ.

## What Changes
- Một form /login, một dashboard /; tự chọn đúng miền xác thực ở máy chủ, không thử sai mật khẩu qua hai miền.
- Admin có tab thống kê trong dashboard; mentor chỉ thấy thống kê. URL báo cáo cũ chuyển về dashboard và giữ khoảng ngày.
- Chi tiết hành động theo tính năng và công cụ AI allowlist, số lượt/người dùng và mức dùng sau trả tiền; không trả raw payload.
- Ưu tiên các tính năng sản phẩm trong phần sử dụng, phân biệt chưa có dữ liệu với không sử dụng.
- Đổi nhãn hoàn tiền và thêm giải thích ngay tại số liệu.

## Capabilities
### New Capabilities
- `unified-admin-usage`: Đăng nhập/dashboard thống nhất và thống kê chi tiết quyền tương ứng.
### Modified Capabilities
- `market-insights`: Bổ sung các nhóm hành động an toàn.

## Impact
Admin UI/auth routing và Backend unified admin login + query analytics. Không tạo/chuyển role hoặc identity cho mentor, không đổi mật khẩu/token/quyền, không sửa Web telemetry/migration/lịch sử giao dịch.
