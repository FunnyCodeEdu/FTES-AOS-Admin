# Tasks — admin-subject-course-links

## 1. API layer (coreClient — /api/v1, key theo subject CODE)
- [x] 1.1 `api/subjects.keys.ts`: thêm `links(code)` vào query-key factory.
- [x] 1.2 `api/subjects.api.ts`: thêm type `WorkspaceLinkView`, `CreateWorkspaceLinkRequest` và
  hằng `COURSE_LINK_TARGET_TYPE='course.course'`, `COURSE_LINK_TAB='LEARNING'` theo BE
  `SubjectDtos.LinkView`/`CreateLinkRequest` + `WorkspaceTab`.
- [x] 1.3 `useSubjectLinks(code)`: GET `/subjects/{code}/links` qua `coreClient` (enabled khi có code).
- [x] 1.4 `useAddSubjectLink(subject)`: POST `/subjects/{code}/links`; onSuccess invalidate
  `links(code)` + `detail(id)`; onError `handleAdminMutationError`.
- [x] 1.5 `useRemoveSubjectLink(subject)`: DELETE `/subjects/{code}/links/{id}`; onSuccess invalidate
  `links(code)` + `detail(id)`; onError `handleAdminMutationError`.

## 2. UI — tab "Khoá học liên kết"
- [x] 2.1 `components/LinkedCoursesTab.tsx`: dùng `useSubjectLinks`, lọc `targetType='course.course'`.
- [x] 2.2 Nguồn picker: `useCourses({ page:1, pageSize:1000 })` — options = khoá CHƯA liên kết,
  và map `targetId → tên khoá` để hiển thị link.
- [x] 2.3 Bảng khoá đã liên kết: cột Khoá học (title || tên resolve || id), Course ID (copyable),
  Tab (Tag), Thao tác (nút "Gỡ liên kết" bọc `<Can permissions={["subject.manage"]}>` + danger confirm).
- [x] 2.4 Khối thêm liên kết (bọc `<Can permissions={["subject.manage"]}>`): `Select` showSearch
  (optionFilterProp="label") + nút "Liên kết" → `useAddSubjectLink` với
  `{ tab:'LEARNING', targetType:'course.course', targetId, titleOverride:tên_khoá }`.
- [x] 2.5 Chặn trùng ở FE (picker ẩn khoá đã liên kết + cảnh báo nếu chọn trùng); empty state khi
  chưa có khoá liên kết; skeleton khi loading; Alert + "Thử lại" khi lỗi tải.
- [x] 2.6 Thêm tab "Khoá học liên kết" vào `pages/SubjectDetailPage.tsx` (giữa Prerequisites và Nhân sự).

## 3. Verify
- [x] 3.1 `npm run build` (tsc -b && vite build) xanh, không lỗi TS.
- [x] 3.2 `npx openspec validate admin-subject-course-links --strict` in "is valid".
