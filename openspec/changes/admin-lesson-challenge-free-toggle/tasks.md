# Tasks

## 1. Thread cờ `free` của bài học xuống card
- [x] 1.1 Thêm `free?: boolean` vào `CourseTreeNode` (types/index.ts)
- [x] 1.2 Map `free: lesson.free` trong `mapAdminCourseToDetail` (courses.api.ts) — BE GraphQL đã trả sẵn
- [x] 1.3 Thêm `free` vào `LessonRow` + `buildLessonRows`, truyền `lessonFree={record.free}` (LessonListTab)
- [x] 1.4 Truyền `lessonFree={meta?.free}` từ LessonEditPage (nguồn adminLessonContent)

## 2. Toggle "Học thử" per-thử-thách
- [x] 2.1 `renderFreeToggle` = Switch + Tooltip trên hàng challenge ĐÃ GẮN (canChallenge); dùng `useUpdateChallenge({ free })`
- [x] 2.2 Spinner theo `freeChallengeId`, `message.success`, hook tự invalidate danh sách
- [x] 2.3 Bỏ tag "Miễn phí" cho người quản (Switch là trạng thái); giữ tag cho người CHỈ ĐỌC

## 3. Toggle "Miễn phí (học thử)" per-BÀI-HỌC
- [x] 3.1 Switch + Tooltip ở đầu card, gate `canManage`, dùng `useUpdateLessonMeta({ free })`
- [x] 3.2 Optimistic local state (seed từ prop `lessonFree`) + revert khi lỗi + `message.success`

## 4. Verify
- [x] 4.1 `npm run typecheck` (tsc -b --noEmit) exit 0
- [x] 4.2 `vitest run src/features/academic` xanh (194 test)
