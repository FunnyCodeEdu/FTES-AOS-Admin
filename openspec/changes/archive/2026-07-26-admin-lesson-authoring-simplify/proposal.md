# admin-lesson-authoring-simplify — màn soạn bài học một trang + popup tạo bài + kéo thả thứ tự

## Why

Vận hành phản hồi màn quản lý bài học rườm rà và thiếu thông tin:

- `LessonEditPage` chia 5 tab (Nội dung / Video / Xem trước / Học thử / Bài tập) — người
  soạn phải nhảy tab để làm một việc duy nhất là "sửa tên, sửa nội dung, đổi video".
- Danh sách bài học chỉ hiện tên; `description` BE đã trả trong `adminCourse` nhưng FE
  không hiển thị và cũng không sửa được (reconcile chỉ PATCH `name`).
- "Thêm bài học" tạo node trống tên "Bài học mới" trong draft, phải bấm "Lưu thay đổi"
  rồi mới vào soạn — không có chỗ chọn loại (video/slide/tài liệu) ngay lúc tạo.
- Đổi thứ tự chỉ có nút mũi tên; yêu cầu là kéo-thả.

## What Changes

- **`LessonEditPage` bỏ HẲN tabs** → một trang: thẻ "Thông tin bài học" (tiêu đề + mô tả,
  PATCH `/courses/lessons/{id}`), "Video" (player + upload + ô dán id/link), "Nội dung"
  (editor markdown + AI sẵn có), "Slide / tài liệu" (upload/gỡ). Ba tab cũ "Xem trước",
  "Học thử", "Bài tập" KHÔNG còn trên màn này (cấu hình học thử cấp khoá vẫn ở
  `CourseDetailPage` → menu "Khác"); component của chúng giữ nguyên trong repo, không xoá.
- **Danh sách bài học** (`LessonListTab`): thêm dòng mô tả sửa tại chỗ (lưu qua
  `reconcileCourseTree`, chỉ PATCH field thật sự đổi), **kéo-thả** đổi thứ tự bài trong
  chương (HTML5 drag native trên row của AntD Table — không thêm dependency), nút mũi tên
  lên/xuống giữ nguyên.
- **Popup "Bài học mới"** (`NewLessonModal`): chọn loại VIDEO / SLIDE / DOCUMENT, nhập tên +
  mô tả, và gắn luôn nội dung — id/link video, file slide (upload), hoặc nội dung markdown
  do AI soạn (`LessonDocGenerateModal` sẵn có). Tạo qua BE ngay rồi invalidate cây khoá
  (không đi qua draft store) — chặn mở popup khi còn thay đổi chưa lưu để không mất draft.
- **Drawer "Xem nội dung"**: nhúng `LessonVideoPreview` → bấm vào bài là xem được video.
- **Sửa lỗi upload video**: `UploadUrlResponse` của BE không còn trả `url` → FE POST vào
  `undefined`. Nay fallback `VITE_UPLOAD_BASE_URL` (mặc định `https://upload.ftes.vn`, đúng
  host `Ftes-frontend/src/lib/api/videoApi.ts` dùng) và gắn lại id do upload service TRẢ VỀ
  qua `video-ref` — id đó mới là id phát được.

Phụ thuộc BE change `course-lesson-video-ref-and-documents` (video-ref + documents endpoints).

## Capabilities

### New Capabilities

- `admin-lesson-authoring`: màn soạn bài học một trang, popup tạo bài theo loại, kéo-thả
  thứ tự bài học, mô tả bài học hiển thị/sửa được.
