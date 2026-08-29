# Design — instructor-course-enroll-shortcut

## Context

Khu giảng viên (`/instructor/*`) và khu quản trị khoá học (`/academic/courses`) là hai lối đi tách
biệt. Danh sách khoá của giảng viên lấy từ `GET /courses/teaching` (BE ép owner theo JWT) và trả
hình dạng riêng `TeachingCourse`; modal cấp học viên lại nhận `Course` của khu academic.

## Decisions

### 1. Dùng lại modal sẵn có, không viết luồng thứ hai

`GrantEnrollmentModal` + `useBulkEnrollPanel` đã xử lý dán danh sách username, báo kết quả theo từng
username, và chọn gói cho khoá bán theo gói. Viết một luồng riêng cho khu giảng viên nghĩa là có hai
chỗ phải sửa mỗi lần đổi quy tắc cấp.

### 2. Chuyển kiểu ở đúng một chỗ

`toCourse(TeachingCourse)` điền id/name/saleMode — thứ modal thực sự đọc — và giá trị trung tính cho
phần còn lại. Cách kia là nới kiểu tham số của modal, làm hỏng ràng buộc cho mọi nơi gọi khác.

### 3. Gate bằng quyền BE đang gác

Endpoint cấp hàng loạt gác `admin.course.manage`. Gate nút bằng đúng quyền đó: giảng viên thuần
không thấy nút thay vì bấm rồi nhận 403. Nếu sau này muốn owner tự cấp học viên cho khoá của mình,
đó là một endpoint owner-scoped ở BE — việc riêng, không gộp vào đây.
