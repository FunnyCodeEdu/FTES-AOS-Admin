# Admin course students roster

## Why

BE đã có báo cáo học viên per-course (`CourseReportController` — change `course-admin-reports`):
`GET /api/v1/courses/admin/reports/courses/{courseId}/students` trả
`CourseStudentsView{courseId, courseTitle, slugName, totalStudents, students:[{userId,
username, email}]}` (quyền `admin.course.manage`). Admin hiện KHÔNG có trang nào hiển thị —
đội vận hành muốn xem ai đang học 1 khóa phải query tay.

## What Changes

- Tab **"Học viên"** mới trong `CourseDetailPage` (cạnh Tổng quan/Nội dung/Pricing/Publish/
  Bài học/Học thử): tổng số học viên + bảng roster (username, email, userId) với search
  client-side theo username/email + nút copy danh sách email (mailto/clipboard).
- API hook `useCourseStudents(courseId)` (coreClient — endpoint KHÔNG nằm dưới `/admin`)
  trong `features/academic/courses/api/`.
- Tab render theo permission `admin.course.manage` (permission-driven, không hardcode role);
  thiếu quyền → không render tab.

## Capabilities

### New Capabilities
- `admin-course-students-roster`: xem roster + email học viên của một khóa.

## Impact

- FE Admin: `CourseDetailPage.tsx` (+1 tab), `courses/api/courses.api.ts` (+1 hook),
  component `CourseStudentsTab.tsx` mới. BE: không đổi (endpoint LIVE).
- Roster chứa email (PII) — chỉ sau permission gate; không log email ra console.
