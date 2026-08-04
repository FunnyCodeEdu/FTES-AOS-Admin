# Tasks — admin-course-terms

## 1. Types & API layer
- [x] 1.1 `types/index.ts`: thêm block `// ---------- Terms ----------` (`TermStatus`, `TermView`,
  `TermCourseView`, `TermAffectedSummaryView`, `TermAffectedCourse`, `CreateTermRequest`,
  `UpdateTermRequest`, `AddCourseRequest`).
- [x] 1.2 `terms/api/terms.keys.ts`: factory phân cấp namespaced `["admin","terms"]`
  (`all/lists/list/details/detail/courses/enrollments`).
- [x] 1.3 `terms/api/terms.api.ts` (qua `apiClient`): `useTerms`, `useTerm(id)`, `useCreateTerm`,
  `useUpdateTerm(id)`, `useDeleteTerm`, `useTermCourses(id)`, `useAddTermCourse(id)`,
  `useRemoveTermCourse(id)`, `useTermAffected(id)` — mutation `onError: handleAdminMutationError` +
  invalidate đúng key.

## 2. Picker & errors
- [x] 2.1 `academic/components/CourseSelect.tsx`: mirror `SubjectSelect`, dùng `useCourses`, prop
  `excludeIds` để ẩn khoá đã thêm.
- [x] 2.2 `shared/api/errors.ts`: thêm `TERM_NOT_FOUND`, `TERM_CODE_TAKEN`, `TERM_VALIDATION`,
  `TERM_COURSE_CONFLICT`, `TERM_OVERLAP` vào `ADMIN_ERROR_MESSAGES` (tiếng Việt).

## 3. Components
- [x] 3.1 `TermFormModal.tsx`: tạo/sửa; RangePicker showTime → startsAt/endsAt (`.toISOString()`),
  InputNumber `reminderLeadDays` default 7; `code` disabled khi sửa; hydrate `dayjs(iso)`.
- [x] 3.2 `TermTable.tsx`: cột code/name/thời gian/trạng thái Tag/số khoá/thao tác; Sửa+Xoá gate
  `term.manage`; Xem → detail.
- [x] 3.3 `TermCoursesTab.tsx`: liệt kê `TermCourseView`; thêm khoá qua `CourseSelect` (excludeIds) →
  `useAddTermCourse` (map `TERM_COURSE_CONFLICT`); gỡ khoá confirm → `useRemoveTermCourse`; gate
  `term.manage`.
- [x] 3.4 `TermAffectedTab.tsx`: `Statistic` tổng ảnh hưởng + số khoá; bảng per-course
  (enrollment/purchase) + nút "Cấp lại học viên" gate `term.manage`.
- [x] 3.5 `TermReAddStudentModal.tsx`: reuse `useGrantCourseEnrollment(courseId)` + `useUsers`
  (search debounce) để cấp lại một học viên vào khoá.

## 4. Pages & routing
- [x] 4.1 `pages/TermListPage.tsx`: title + filter client-side + refresh + "Tạo kỳ" gate + table +
  loading/empty/error.
- [x] 4.2 `pages/TermDetailPage.tsx`: header info + "Sửa" gate + Tabs (Khóa học trong kỳ / Ảnh hưởng).
- [x] 4.3 `routeRegistry.tsx`: import 2 page + entry `/academic/terms` (nav "Kỳ học", group "Học thuật",
  `term.view`) + `/academic/terms/:id` (`term.view`, no nav); import `CalendarOutlined`.

## 5. Verify
- [x] 5.1 `npx tsc --noEmit` sạch.
- [x] 5.2 `npm run build` xanh.
- [x] 5.3 `npx openspec validate admin-course-terms --strict` in "is valid".
