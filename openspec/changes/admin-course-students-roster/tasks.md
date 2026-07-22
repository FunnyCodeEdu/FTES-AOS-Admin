# Tasks — admin-course-students-roster

## 1. API + UI
- [x] 1.1 `useCourseStudents(courseId)` (coreClient GET `/courses/admin/reports/courses/{id}/students`) + `coursesKeys.students`
- [x] 1.2 `CourseStudentsTab` (Statistic + Table + Search client-side + Copy emails clipboard); gắn tab vào `CourseDetailPage` gate theo permission `course.manage` (chuỗi permission FE cho `admin.course.manage`, khớp `canUpdate` toàn trang); xử lý 403/empty/loading
- [x] 1.3 Quality loop: tách helper thuần `filterStudents` + `buildEmailList` (export để test); vitest đã có trong repo → unit test PASS 2026-07-22 (`CourseStudentsTab.test.ts`: filter theo tên/email không phân biệt hoa thường, dedupe email giữ thứ tự, bỏ email rỗng); e2e apitest còn nợ

## 2. Verify chung
- [x] 2.1 `npm run build` xanh + `tsc --noEmit` sạch; `openspec validate admin-course-students-roster --strict` pass

## Nghiệm thu E2E 2026-07-23
- BLOCKED-ADMIN-CREDS: kịch bản cần đăng nhập ADMIN vào CMS; mật khẩu admin.test đã xoay 2026-07-21 (/root/.ftes-test-credentials trên box apitest), máy local không SSH tới box. Điều kiện mở khoá: cấp lại mật khẩu admin.test hoặc chạy trên server.
