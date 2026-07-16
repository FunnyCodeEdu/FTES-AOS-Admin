# Admin lesson exercise authoring (soạn quiz / assignment / challenge per-lesson)

## Why

Admin KHÔNG có bất kỳ UI nào để tạo bài tập cho buổi học, dù BE đã đủ endpoint:

- `CourseTreeEditor` có khái niệm node "assignment" nhưng khi Lưu thì **bỏ im lặng**
  (`courses.api.ts:263` — `if (lessonNode.type !== "lesson") continue`), người soạn tưởng
  đã lưu mà mất trắng.
- Không màn tạo quiz cho lesson (`POST /api/v1/courses/lessons/{id}/quizzes` + questions +
  publish đã LIVE); `QuizBankPage` chỉ là ngân hàng câu hỏi theo subject, không gắn lesson.
- Không màn tạo assignment (`POST /api/v1/courses/lessons/{id}/assignments` đã LIVE).
- Không UI challenge nào — BE có đủ: `POST /api/v1/challenges`, `PUT /{id}/mcq-questions`,
  `PUT /{id}/test-cases`, `PUT /{id}/rubrics`, `PUT /{id}/lesson` (gắn lesson — ràng buộc
  **≤1 challenge ACTIVE/lesson**, unique index `uq_challenge_lesson_active` V194, đã chốt
  KHÔNG đổi), `POST /{id}/publish`. 3 loại: `MULTIPLE_CHOICE` (tự chấm) / `CODE` / `ESSAY`
  (AI chấm — lane ftes-ai-service).

Mô hình mỗi buổi: N assignment + N quiz + ≤1 challenge.

## What Changes

- **Tab "Bài tập" trong `LessonEditPage`** (cạnh Nội dung/Video/Học thử): list 3 loại bài
  tập đang gắn lesson + nút "Thêm bài tập" mở modal **chọn loại**:
  - *Quiz trắc nghiệm*: form tạo quiz → thêm câu hỏi (SINGLE/MULTIPLE/TRUE_FALSE, options +
    correctKeys) → publish/unpublish/archive.
  - *Assignment code (GitHub)*: form đề bài + criteria + fileExtension + maxSubmissions.
  - *Challenge (MCQ / CODE / ESSAY)*: wizard tạo challenge → nhập MCQ questions HOẶC
    test-cases + rubrics (CODE) HOẶC rubrics (ESSAY) → gắn lesson → publish; chặn khi lesson
    đã có challenge active (409 hiển thị rõ).
- **API layer mới** `features/academic/exercises/api/exercises.api.ts` (coreClient `/api/v1`):
  quiz/assignment CRUD theo endpoint course, challenge theo `/api/v1/challenges`.
- **`CourseTreeEditor`**: BỎ hẳn node type "assignment" (không cho thêm mới, node cũ trong
  draft hiển thị cảnh báo di dời) — soạn bài tập chuyển về tab Bài tập của lesson; hết
  chuyện drop im lặng khi sync.

## Capabilities

### New Capabilities
- `admin-lesson-exercise-authoring`: tab soạn bài tập per-lesson 3 loại dùng endpoint sẵn có.
- `admin-tree-assignment-node-removal`: gỡ node assignment FE-only khỏi tree editor.

## Impact

- FE Admin: `features/academic/lessons/pages/LessonEditPage.tsx` (+tab),
  `features/academic/exercises/*` (mới), `courses/components/CourseTreeEditor.tsx` + store draft.
- BE: dùng nguyên endpoint sẵn có + `GET /courses/lessons/{id}/quizzes?includeDrafts=true`
  từ change BE `course-learn-contract-gaps` (deploy trước).
- Permission: quiz/assignment bám `course.manage` ownership (BE enforce ở service — UI dùng
  `useCanManageCourse` sẵn có); challenge bám `challenge.manage` (render theo permission,
  không hardcode role).
