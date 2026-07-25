## Why

Admin cần **cấp quyền học viên vào course** (gán 1 user vào 1 course) — một trong các năng lực quản lý course sếp yêu cầu, hiện **chưa có UI** ở admin. Backend vừa bổ sung endpoint `POST /api/v1/admin/courses/{id}/enrollments {userId}` (change `admin-grant-course-enrollment`), nên giờ dựng được UI chạy thật.

## What Changes

- **Hook** `useGrantCourseEnrollment(courseId)` gọi `POST /courses/{id}/enrollments` (qua `apiClient` base `/api/v1/admin`).
- **`GrantEnrollmentModal`** (mới): chọn học viên bằng Select có tìm kiếm (dùng `useUsers` — `adminUsers` GraphQL) rồi cấp quyền; báo thành công/lỗi.
- **`CourseTable`**: thêm action "Cấp học viên" (gate `course.update`) mở modal cho đúng course của hàng.
- **`CourseListPage`**: quản state modal grant + truyền `onGrant` xuống bảng.

## Capabilities

### New Capabilities

- `admin-course-enrollment-grant-ui`: Từ danh sách course, admin chọn 1 course + tìm & chọn 1 học viên → cấp quyền vào course qua endpoint admin; hiển thị kết quả, gate theo permission.

## Impact

- **FE mới/sửa**: `courses/api/courses.api.ts` (hook), `courses/components/GrantEnrollmentModal.tsx` (mới), `courses/components/CourseTable.tsx` (action), `courses/pages/CourseListPage.tsx` (wiring).
- **BE**: dùng endpoint đã có (`admin-grant-course-enrollment`), không đổi.
- **Ngoài scope (change sau)**: re-point course-detail/tree + nối lesson content — chặn bởi việc BE chưa có đường đọc course-detail-by-id cho admin (GraphQL chỉ có `adminCourses` list, không có `adminCourse` detail; creator detail theo slug mà list không trả slug). Cần 1 mẩu BE (thêm `adminCourse(id)` detail hoặc slug vào list) trước khi làm tree — tách riêng.
