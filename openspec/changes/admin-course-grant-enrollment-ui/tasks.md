## 1. Data hook

- [x] 1.1 `courses/api/courses.api.ts`: thêm `useGrantCourseEnrollment(courseId)` — `useMutation<void, Error, { userId: string }>` gọi `apiClient.post(\`/courses/${courseId}/enrollments\`, values)`, `onError: handleAdminMutationError`.

## 2. Grant modal

- [x] 2.1 `courses/components/GrantEnrollmentModal.tsx` (mới): props `{ open, course, onClose }`; antd Modal + Form + Select (`showSearch`, `filterOption={false}`, debounce 300ms) dùng `useUsers({search})` → options `{label: "username · email", value: id}`; submit → `useGrantCourseEnrollment(course.id).mutate({userId})` → success message + onClose; loading/disable khi đang gửi.

## 3. Wire vào list

- [x] 3.1 `courses/components/CourseTable.tsx`: thêm prop `onGrant?: (course) => void` + nút "Cấp học viên" (`UsergroupAddOutlined`, `Can permissions={["course.update"]}`) trong cột Thao tác.
- [x] 3.2 `courses/pages/CourseListPage.tsx`: state `grantCourse`; truyền `onGrant={setGrantCourse}` xuống bảng; render `GrantEnrollmentModal` với `open={!!grantCourse}`.

## 4. Verify

- [x] 4.1 `tsc --noEmit` sạch.
- [x] 4.2 `npm run build` xanh.
- [~] 4.3 Render drive auth-gated (cần login admin) → verify = tsc + vite build xanh.
