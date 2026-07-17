# Tasks — admin-course-students-roster

## 1. API + UI
- [x] 1.1 `useCourseStudents(courseId)` (coreClient GET `/courses/admin/reports/courses/{id}/students`) + `coursesKeys.students`
- [x] 1.2 `CourseStudentsTab` (Statistic + Table + Search client-side + Copy emails clipboard); gắn tab vào `CourseDetailPage` gate theo permission `course.manage` (chuỗi permission FE cho `admin.course.manage`, khớp `canUpdate` toàn trang); xử lý 403/empty/loading
- [~] 1.3 Quality loop: tách helper thuần `filterStudents` + `buildEmailList` (export để test); repo admin CHƯA có test runner (vitest) nên unit/e2e chưa chạy được — ghi BACKLOG-REVIEW-lane-course.md

## 2. Verify chung
- [x] 2.1 `npm run build` xanh + `tsc --noEmit` sạch; `openspec validate admin-course-students-roster --strict` pass
