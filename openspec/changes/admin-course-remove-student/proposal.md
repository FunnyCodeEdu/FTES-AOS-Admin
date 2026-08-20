## Why

Tab Học viên của khoá chỉ liệt kê + copy email, chưa gỡ được học viên. Anh cần "xoá học viên ra khỏi
khóa học".

## What Changes

- `useRemoveCourseStudent(courseId)`: DELETE /admin/courses/{id}/enrollments/{userId} + {reason};
  invalidate roster + counter.
- `CourseStudentsTab`: thêm cột **"Thao tác"** với nút **"Xoá khỏi khoá"** (danger) mỗi hàng, gated
  <Can course.manage> → DeleteConfirmModal (nhập lý do) → mutation. Tổng học viên + bảng cập nhật ngay.

## Capabilities

### Modified Capabilities

- `academic-course-console`: admin gỡ học viên khỏi khoá ngay ở tab Học viên (confirm + lý do).
