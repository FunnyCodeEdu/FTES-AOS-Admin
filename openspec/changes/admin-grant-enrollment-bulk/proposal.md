## Why

Nút "Cấp học viên" ở danh sách khoá chỉ cấp được MỘT người (chọn 1 user trong Select) — muốn cấp cả
lớp phải mở đi mở lại. Chủ sản phẩm yêu cầu: cấp hàng loạt theo username, và **hỏng một username thì
chỉ báo username đó**, không đánh trượt cả danh sách.

## What Changes

- Tách cụm "dán username hàng loạt" thành `useBulkEnrollPanel` (file `bulkEnroll.tsx`) — dùng CHUNG
  cho tab Học viên và nút "Cấp học viên" ở danh sách khoá, nên hai chỗ hành xử y hệt.
- `GrantEnrollmentModal`: bỏ Select-một-người, chuyển sang panel dán username → gọi endpoint bulk
  (BE cấp từng cái, trả {added, notFound, failed}).
- Quy tắc báo kết quả: thành công HẾT → báo thành công + đóng modal; còn lại → nêu ĐÚNG username không
  cấp được (không tìm thấy / lỗi), số còn lại vẫn đã được cấp.
- `CourseStudentsTab` dùng lại panel chung (gỡ bản trùng lặp trong file).

## Capabilities

### Modified Capabilities

- `academic-course-console`: cấp học viên hàng loạt theo username từ danh sách khoá, báo lỗi theo từng username.
