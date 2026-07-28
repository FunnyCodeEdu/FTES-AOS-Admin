# video-preview-admin-toggle — học thử VIDEO theo % (preview_percent) trên console admin

## Why

BE đổi cổng học thử VIDEO (change `video-preview-admin-gate`): một buổi video chỉ previewable khi
Admin/giảng viên BẬT học thử TƯỜNG MINH với `preview_percent > 0` — KHÔNG còn tự bật theo cửa-sổ-giây
mặc định (`default_preview_seconds = 900`). BE tính cửa sổ xem thử video = `% × thời lượng`, và
`updateLessonPreview` chấp nhận `previewPercent` cho VIDEO (yêu cầu video READY).

Console admin (`admin-course-trial-ux`) hiện cấu hình học thử VIDEO theo số GIÂY (`preview_seconds`).
Sau thay đổi BE, ghi `preview_seconds` cho video KHÔNG còn bật được học thử → giảng viên bật switch mà
video vẫn bị khoá (thất bại thầm lặng), và cột "Thời gian học thử" hiển thị số giây gây hiểu nhầm cho
một buổi mà BE coi là KHÔNG previewable. Cần đưa MỌI control học thử VIDEO trên admin về đúng đơn vị %.

## What Changes

- **`LessonTrialConfig`** (thẻ học thử trong trang soạn bài `LessonEditPage`): VIDEO nay dùng
  `preview_percent` như DOCUMENT — nhãn "Phần trăm thời lượng video được xem thử", BẬT = ghi
  `previewPercent > 0`, TẮT = ghi `0`. Hiển thị quy đổi `≈ mm:ss` (= % × thời lượng) cho giảng viên dễ
  hình dung. Chặn lưu khi video chưa READY (BE 400). Vẫn gate bằng cùng quyền quản nội dung khoá
  (`disabled={!canManage}`), tái dùng đúng component + write path sẵn có (`PATCH /lessons/{id}/preview`).
- **`LessonListTab`** (cột "Thời gian học thử" trên danh sách bài học): `InlineTrialEditor` +
  `PreviewTooltip` cho VIDEO chuyển từ giây sang % — cùng đơn vị với DOCUMENT; tag video hiện
  `X% (≈ mm:ss)`, phân biệt kế thừa/ghi đè; inline editor chặn khi video đang xử lý.
- KHÔNG động cờ `free`; TẮT = ghi `0` (không `null`) — giữ nguyên semantics BẬT/TẮT của
  `admin-course-trial-ux`.

## Impact

Admin-only (FE, feature `academic/lessons`). Sửa: `LessonTrialConfig.tsx`, `LessonListTab.tsx`
(PreviewTooltip + InlineTrialEditor), 1 comment `LessonEditPage.tsx`. KHÔNG đổi API client / type
(đã có `previewPercent`, `effectivePreviewPercent`, `videoDurationSeconds`, `videoStatus`). `npm run
build` (tsc -b && vite build) xanh. Ăn khớp BE change `video-preview-admin-gate`.

## Capabilities

### New Capabilities

- `video-preview-admin-toggle`: cấu hình học thử VIDEO theo % (preview_percent) trên console admin,
  đồng bộ cổng học thử video của BE; không rò rỉ nội dung, dùng đúng semantics BẬT/TẮT.
