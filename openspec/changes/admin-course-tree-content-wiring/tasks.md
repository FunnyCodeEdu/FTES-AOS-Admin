## 1. coreClient

- [x] 1.1 `shared/api/client.ts`: refactor attach interceptor thành `installInterceptors(client)` (request token + response unwrap + 401 refresh retry theo `client`); áp cho `apiClient`; thêm `export const coreClient` (base `${API_ROOT}/api/v1`) + `installInterceptors(coreClient)`.

## 2. useCourse → adminCourse(id)

- [x] 2.1 `courses/api/courses.api.ts`: `useCourse(id)` dùng `graphqlRequest(ADMIN_COURSE_QUERY,{id})`; map `adminCourse` → `CourseDetail` (tree: sections→lessons, `id`+`key`=BE id, lesson `lessonType`=type; status UPPERCASE→lowercase; packages/publishChecklist=[]); null → throw.

## 3. Tree granular save

- [x] 3.1 `courses/api/courses.api.ts`: hàm `reconcileCourseTree(courseId, draft: CourseTreeNode[], server: CourseTreeNode[])` — tuần tự POST/PATCH section + lesson (sortOrder=index, `coreClient`), thu id sống, DELETE id server không còn (section xoá thì bỏ qua lesson con), bỏ node assignment. Hook `useSaveCourseTree(courseId)` (mutation) gọi nó.
- [x] 3.2 `courses/components/CourseTreeEditor.tsx`: thay `useUpdateCourseTree` bằng `useSaveCourseTree`; `handleSave` truyền `{ draft: tree, server: course.tree }`; onSuccess invalidate detail + message; giữ error alert.

## 4. Lesson content thật

- [x] 4.1 `lessons/api/lessons.api.ts`: `useLessonContent`/`useUpdateLessonContent` gọi `coreClient` `GET/PUT /lessons/{id}/content` (map `bodyMd`↔`body`, `readingMinutes`); bỏ mock 2 hàm này (preview/course-preview-default giữ mock).

## 5. Verify

- [x] 5.1 `tsc --noEmit` sạch.
- [x] 5.2 `npm run build` xanh.
