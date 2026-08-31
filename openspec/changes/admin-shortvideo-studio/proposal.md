# admin-shortvideo-studio — Studio video ngắn

## Why

Video bài giảng của FTES là tài sản đã có sẵn transcript kèm mốc thời gian (dịch vụ upload tự-host
trả `transcriptSegmentsOf(videoId)`), nhưng chưa có đường nào biến một buổi giảng 90 phút thành vài
clip ngắn để đẩy lên mục Tin của cộng đồng. Hiện mentor muốn có clip thì phải tự tải video về, tự
cắt bằng phần mềm ngoài, rồi tự đăng — nên trên thực tế không ai làm.

Đợt này BE mở module `shortvideo` (AI đọc transcript đề xuất điểm nhấn + gọi dịch vụ video cắt theo
biên segment) và Community mở mục Tin. Admin cần một màn hình để mentor dùng được cả chuỗi đó.

## What Changes

- Route mới `/content/shortvideo`, nav "Studio video ngắn" nhóm **Nội dung**, gate
  `shortvideo.manage`.
- **Tạo clip**: chọn khoá học → chọn bài học loại VIDEO → "Đề xuất highlight" → danh sách đề xuất
  của AI (tiêu đề, lý do, mốc vào/ra mm:ss, độ dài). Mỗi đề xuất SỬA được tiêu đề và mốc vào/ra
  trước khi bấm "Cắt clip".
- **Studio**: bảng clip (tiêu đề, khoá/bài, độ dài, trạng thái, ngày tạo) + Tải về, Publish/Gỡ,
  Xoá. Xoá đi qua `DeleteConfirmModal` (ô lý do, ghi audit).
- Chặn khoảng cắt vô lý NGAY Ở FE: mốc âm, mốc ra ≤ mốc vào, ngắn hơn 1 giây, dài quá 180 giây,
  vượt thời lượng video khi biết thời lượng.
- Điện thoại: `useIsMobile` + `ResponsiveTable`/`MobileCard` + `scroll={{x:"max-content"}}` +
  `Drawer` chi tiết clip; nút hành động chính full-width.

## Non-goals

- KHÔNG dựng trình cắt video trong trình duyệt: việc cắt do dịch vụ `OptimizeSubtitle` làm
  (remux theo biên segment, không encode lại). Admin chỉ chọn khoảng.
- KHÔNG tự sinh tiêu đề/phụ đề dán lên clip trong đợt này.

## Capabilities

### New Capabilities
- `admin-shortvideo-studio`: tạo clip từ đề xuất AI và quản lý clip đã cắt (tải về, đăng/gỡ mục
  Tin, xoá).

## Impact

- Mới: `src/features/content/shortvideo/**` (types, `timecode.ts`, `format.ts`, `api/*`,
  `components/*`, `pages/ShortVideoStudioPage.tsx`).
- Sửa: `src/app/routeRegistry.tsx` (route + nav), `src/shared/api/errors.ts` (mã
  `SHORTVIDEO_NO_TRANSCRIPT`).
- Dùng lại sẵn có: `CourseSelect`, `useCourse` (cây khoá học), `useLessonStream` (lấy `videoRef`
  làm `videoId`), `useLessonPreview` (thời lượng video), `DeleteConfirmModal`, `ResponsiveTable`,
  `MobileCard`, `PageHeader`, `Can`.
- Phụ thuộc BE change `shortvideo` (`/api/v1/admin/shortvideo/...`, permission `shortvideo.manage`)
  và Community change `stories` — cả hai đang làm SONG SONG, chưa gọi thử được API thật.
