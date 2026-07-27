## 1. API hooks

- [x] 1.1 `subjects.keys.ts`: thêm key `links(code)`.
- [x] 1.2 `subjects.api.ts`: types `WorkspaceTab`, `WorkspaceLinkView`, `CreateWorkspaceLinkRequest`
  + hằng `COURSE_TARGET_TYPE = 'course.course'`.
- [x] 1.3 `subjects.api.ts`: `useSubjectLinks(code)` — GET `coreClient /subjects/{code}/links` →
  `WorkspaceLinkView[]` (enabled khi có code).
- [x] 1.4 `subjects.api.ts`: `useCreateSubjectLink(subject)` — POST `coreClient /subjects/{code}/links`
  body `{tab:'LEARNING', targetType:'course.course', targetId}`; onSuccess invalidate `links(code)`;
  onError `handleAdminMutationError`.
- [x] 1.5 `subjects.api.ts`: `useDeleteSubjectLink(subject)` — DELETE
  `coreClient /subjects/{code}/links/{id}`; onSuccess invalidate `links(code)`; onError
  `handleAdminMutationError`.

## 2. Course picker

- [x] 2.1 `components/CourseSelect.tsx` (mới) — khuôn `SubjectSelect`, `useCourses({page:1,
  pageSize:1000})`, `showSearch`, options `{value:id, label:name}`.

## 3. Linked-courses tab

- [x] 3.1 `subjects/components/LinkedCoursesTab.tsx` (mới): list link `course.course` của môn
  (`useSubjectLinks(subject.code)` lọc `targetType==='course.course'`), resolve tên khoá qua
  `useCourses`, bảng cột Tên khoá / (mã) + nút Gỡ.
- [x] 3.2 Picker `CourseSelect` + nút "Liên kết" trong `<Can subject.manage>`; chặn trùng khoá đã
  liên kết (message.warning) trước khi gọi `useCreateSubjectLink`.
- [x] 3.3 Nút Gỡ trong `<Can subject.manage>` + `Modal.confirm` → `useDeleteSubjectLink`.
- [x] 3.4 Loading skeleton + Alert lỗi + nút Thử lại (khuôn StaffTab).

## 4. Wire vào màn chi tiết

- [x] 4.1 `SubjectDetailPage.tsx`: thêm tab `{ key:'courses', label:'Khóa học liên kết',
  children:<LinkedCoursesTab subject={subject} /> }`.

## 5. Error mapping

- [x] 5.1 `shared/api/errors.ts`: map `SUBJECT_LINK_DUPLICATE` / `SUBJECT_LINK_NOT_FOUND` sang tiếng
  Việt.

## 6. Verify

- [x] 6.1 `npx tsc --noEmit` sạch.
- [x] 6.2 `npm run build` xanh.
