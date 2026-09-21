# Tasks — fix-admin-user-status-filter

## 1. Contract trạng thái
- [x] 1.1 Tạo mapper UI ↔ backend và metadata dùng chung cho trạng thái tài khoản.
- [x] 1.2 Áp dụng mapper cho query danh sách và chi tiết user.

## 2. Giao diện
- [x] 2.1 Dùng options chung trong bộ lọc và bổ sung trạng thái vô hiệu hoá.
- [x] 2.2 Dùng metadata chung cho bảng và trang chi tiết.

## 3. Kiểm thử
- [x] 3.1 Thêm unit test phủ toàn bộ mapping, tương thích `PENDING`, trim/case và trạng thái lạ.
- [x] 3.2 Chạy test liên quan và toàn bộ test suite.
- [x] 3.3 Chạy `npx tsc -b` và `npm run build` xanh.
