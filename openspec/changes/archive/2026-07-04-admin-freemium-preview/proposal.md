# admin-freemium-preview — Soạn document lesson + cấu hình học thử

## Why
Backend change `course-freemium-preview` (FTES-AOS-Backend) thêm: nội dung markdown cho
lesson type DOCUMENT (`lesson_contents`, marker `<!-- ftes:preview-end -->` chốt điểm cắt
teaser) và cửa sổ xem thử video (default 900s per-course, override per-lesson). Mentor/Admin
mảng học thuật cần UI để soạn bài đọc và chỉnh cấu hình học thử — hiện admin academic console
chưa có cả hai.

## What Changes
- **Document content editor** trong lesson editor (lesson type DOCUMENT): textarea/CodeMirror
  markdown + preview pane render; nút "Chèn điểm cắt học thử" chèn marker
  `<!-- ftes:preview-end -->` tại con trỏ (tối đa 1 marker — chèn lần 2 thì di chuyển marker);
  hiển thị ước lượng "học viên chưa mua sẽ đọc được tới đây". Lưu qua
  `PUT /api/v1/lessons/{id}/content`.
- **Preview config per-lesson** (lesson type VIDEO): field "Thời lượng học thử" (mm:ss,
  mặc định kế thừa course, hiển thị giá trị kế thừa khi bỏ trống; 0 = tắt) →
  `PATCH /api/v1/lessons/{id}/preview`. Validate ≤ thời lượng video khi video READY.
- **Preview default per-course** trong course settings: "Học thử mặc định cho video" (mặc định
  15:00) → `PATCH /api/v1/courses/{id}/preview-default`.
- Cột/badge trong bảng lesson: type DOCUMENT có nội dung hay chưa (`hasContent`), preview
  hiệu dụng của lesson.

## Capabilities
### New Capabilities
- `admin-freemium-preview`: markdown editor + preview marker + cấu hình thời lượng học thử.
### Modified Capabilities
- (none — mở rộng màn hình của `admin-academic-console`)

## Impact
FE admin only; tiêu thụ API của BE change `course-freemium-preview`. Quyền: chỉ hiện với
user có `course.manage` trên course (ownership-scoped — mentor sở hữu, Admin mảng học thuật).
Build stays green.
