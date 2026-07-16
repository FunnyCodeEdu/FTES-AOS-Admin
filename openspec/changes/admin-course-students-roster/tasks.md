# Tasks — admin-course-students-roster

## 1. API + UI
- [ ] 1.1 `useCourseStudents(courseId)` (coreClient GET `/courses/admin/reports/courses/{id}/students`) + `coursesKeys.students`
- [ ] 1.2 `CourseStudentsTab` (Statistic + Table + Search client-side + Copy emails clipboard); gắn tab vào `CourseDetailPage` gate theo permission `admin.course.manage`; xử lý 403/empty/loading
- [ ] 1.3 Quality loop tính năng roster: unit test (filter search, build chuỗi copy, gate permission) + e2e test (seed demo: mở tab thấy học viên seed; account thiếu quyền không thấy tab) → đánh giá vòng 1 → fix → đánh giá vòng 2

## 2. Verify chung
- [ ] 2.1 `npm run build` xanh + `tsc --noEmit` sạch; `openspec validate admin-course-students-roster --strict` pass
