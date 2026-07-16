# admin-course-students-roster

## ADDED Requirements

### Requirement: Course detail shows a students roster tab
`CourseDetailPage` SHALL có tab "Học viên" (chỉ render khi caller có permission `admin.course.manage`) hiển thị `totalStudents` + bảng roster (username, email, userId) từ `GET /api/v1/courses/admin/reports/courses/{courseId}/students`.

#### Scenario: Admin đủ quyền xem roster
- **WHEN** admin có `admin.course.manage` mở course có 3 học viên enroll active
- **THEN** tab Học viên hiện tổng 3 + bảng 3 dòng với email

#### Scenario: Thiếu quyền
- **WHEN** user không có `admin.course.manage` mở course detail
- **THEN** tab Học viên KHÔNG render (permission-driven, không chỉ disable)

#### Scenario: BE trả 403
- **WHEN** permission bị thu hồi giữa phiên và request trả 403
- **THEN** tab hiện Alert lỗi quyền, không crash

### Requirement: Roster search and email copy
Tab SHALL hỗ trợ search client-side theo username/email và nút "Copy emails" ghi danh sách email (phân tách dấu phẩy) vào clipboard kèm thông báo thành công; email KHÔNG được đưa vào URL hay log.

#### Scenario: Search
- **WHEN** admin gõ một phần email vào ô search
- **THEN** bảng chỉ còn các dòng khớp username/email

#### Scenario: Copy emails
- **WHEN** admin bấm Copy emails khi bảng đang filter còn 2 dòng
- **THEN** clipboard chứa đúng 2 email đang hiển thị

## Seed data

- Không seed ở repo Admin. Dùng BE seed `course-demo-seed-dev` (V213): enrollment demo
  `seed-enroll-demo-c1` trên course `seed-course-c-basic` → roster có ≥1 học viên (khi
  account test student tồn tại trong `identity.users`); course chưa ai học dùng để test
  empty state.
