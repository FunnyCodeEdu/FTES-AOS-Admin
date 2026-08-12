## Why

Modal "Bài học mới" với loại VIDEO chỉ có ô **dán ID/link** — KHÔNG có nút tải file video lên. Người
tạo bài phải để trống rồi vào màn soạn bài mới upload được → dễ tạo nhầm bài "không video". Endpoint
upload tự-host đã có (upload-url → upload service → complete → set video-ref) nhưng chỉ dùng ở
`LessonVideoUpload` (màn soạn bài).

## What Changes

- Helper thuần `uploadLessonVideoFile(lessonId, file, title, onProgress)` (lessons.api) gộp 4 bước
  upload video tự-host qua `coreClient` trực tiếp (không qua hook bind-lessonId) — tái dùng được ở
  modal tạo bài (lessonId chỉ có sau create).
- `NewLessonModal` (loại VIDEO): thêm **nút "Chọn file video"** (upload trực tiếp) + thanh tiến trình;
  giữ ô dán ID/link làm phương án phụ (disable khi đã chọn file). Bấm "Tạo bài học" → create lesson →
  nếu có file thì upload luôn tại chỗ. Chặn Huỷ khi đang upload.

Không đổi BE. (Upload tự-host vẫn phụ thuộc CORS `upload.ftes.vn` cho origin admin — hạ tầng.)

## Capabilities

### Modified Capabilities

- `admin-lesson-authoring`: tạo bài VIDEO tải file lên trực tiếp trong modal (không phải mở màn soạn bài).
