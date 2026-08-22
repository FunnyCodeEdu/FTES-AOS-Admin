## Why

Anh cần thêm nhiều học viên vào khoá một lần bằng cách dán danh sách username (cách nhau dấu phẩy).

## What Changes

- `useBulkEnrollByUsername(courseId)`: POST /admin/courses/{id}/enrollments/bulk {usernames} → {added,
  notFound, failed}.
- `CourseStudentsTab`: nút **"Thêm học viên"** (gated course.manage) mở Modal — TextArea dán username
  cách nhau dấu phẩy/xuống dòng (parseUsernames bỏ trùng/rỗng) → gửi → hiện kết quả (đã thêm / không
  tìm thấy / lỗi) theo từng username. Roster + "Tổng học viên" cập nhật ngay.

## Capabilities

### Modified Capabilities

- `academic-course-console`: admin thêm học viên hàng loạt theo username ngay ở tab Học viên.
