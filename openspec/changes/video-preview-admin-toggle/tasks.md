# Tasks — video-preview-admin-toggle (Admin)

## 1. LessonTrialConfig: VIDEO theo %
- [x] 1.1 Bỏ nhánh giây cho VIDEO; dùng `preview_percent` cho cả DOCUMENT lẫn VIDEO (state `percent`)
- [x] 1.2 Nhãn video "Phần trăm thời lượng video được xem thử"; BẬT = ghi `previewPercent > 0`,
  TẮT = ghi `0`; KHÔNG gửi `null`, KHÔNG động cờ `free`
- [x] 1.3 Hiển thị quy đổi `≈ mm:ss` (= % × `videoDurationSeconds`) khi biết thời lượng
- [x] 1.4 Chặn BẬT/lưu khi `videoStatus !== "ready"` (BE 400 nếu chưa READY) + hint
- [x] 1.5 Mount đã sẵn cho VIDEO trong `LessonEditPage`, gate cùng quyền `canManage`; cập nhật comment

## 2. LessonListTab: cột học thử VIDEO theo %
- [x] 2.1 `PreviewTooltip`: VIDEO dùng `previewPercent`/`effectivePreviewPercent`, thêm `≈ mm:ss`
- [x] 2.2 `InlineTrialEditor`: VIDEO ghi `previewPercent` (bỏ `previewSeconds`), max 100, addon "%";
  chặn khi video đang xử lý; nhãn kế thừa `X% (≈ mm:ss)` cho video

## 3. Verify
- [x] 3.1 `npm run build` (tsc -b && vite build) xanh (exit 0)
- [x] 3.2 Không đổi API client/type — `previewPercent`/`effectivePreviewPercent`/`videoDurationSeconds`/
  `videoStatus` đã có sẵn ở `LessonPreview`
