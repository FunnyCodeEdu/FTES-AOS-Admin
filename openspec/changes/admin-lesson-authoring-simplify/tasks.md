# Tasks — admin-lesson-authoring-simplify

> Dependency: BE change `course-lesson-video-ref-and-documents` (PUT /lessons/{id}/video-ref,
> POST/GET/DELETE lesson documents) phải deploy apitest trước khi E2E phần video/slide.

## 1. API layer
- [x] 1.1 `lessons.api.ts`: `useUpdateLessonMeta` (PATCH name/description),
      `useCreateLesson` (tạo + gắn video-ref / file / bodyMd), `useSetLessonVideoRef`,
      `useLessonDocuments` / `useUploadLessonDocument` / `useDeleteLessonDocument`,
      hằng `UPLOAD_BASE_URL`
- [x] 1.2 `lessons.keys.ts`: key `documents`; `types`: thêm `SLIDE` vào `LessonType`
- [x] 1.3 `reconcileCourseTree`: PATCH `description` khi đổi (chỉ gửi field đổi), POST lesson
      mới kèm description

## 2. Màn soạn bài học
- [x] 2.1 `LessonEditPage` bỏ `Tabs` → 4 thẻ (Thông tin / Video / Nội dung / Slide)
- [x] 2.2 `LessonDocumentsPanel` mới (list + upload + gỡ)
- [x] 2.3 `LessonVideoUpload`: fallback UPLOAD_BASE_URL, gắn lại id upload service trả về,
      ô "ID video / link YouTube"

## 3. Danh sách bài học
- [x] 3.1 Mô tả sửa tại chỗ + hiển thị ở chế độ chỉ đọc
- [x] 3.2 `DraggableRow` — kéo thả đổi thứ tự bài trong chương (drag native, no dependency);
      chương kéo bằng tay cầm `HolderOutlined` ở tiêu đề card
- [x] 3.3 `NewLessonModal` + chặn mở khi draft chưa lưu
- [x] 3.4 `LessonContentDrawer` nhúng `LessonVideoPreview`

## 4. Nghiệm thu
- [x] 4.1 `tsc --noEmit` sạch + `npm run build` xanh (2026-07-25)
- [ ] 4.2 E2E apitest sau khi BE deploy: tạo bài VIDEO bằng link YouTube từ popup → xem được
      video trong drawer; upload PDF cho bài SLIDE; kéo đảo 2 bài rồi Lưu → thứ tự giữ sau reload
- [x] 4.3 Xoá hẳn `LessonExercisesTab` / `LessonPreviewConfig` / `LessonContentVideoPreview`
      + nhánh chỉ chúng gọi (`AddExerciseModal`, `AssignmentFormModal`, `QuizComposerDrawer`).
      `ChallengeWizardDrawer` GIỮ vì `CourseChallengeBankTab` còn dùng.
- [x] 4.4 Nút "Mở" tài liệu tải QUA BE (`/documents/{id}/download`) rồi bung blob — URL
      Cloudinary raw trả 401, và `<a href>` không gửi được Bearer. Kèm sửa interceptor
      `coreClient`: body Blob thì trả nguyên, không bóc envelope.
- [x] 4.5 Push `main` 2026-07-26 (c1d3824 + 922cdda) sau khi BE deploy apitest xanh
