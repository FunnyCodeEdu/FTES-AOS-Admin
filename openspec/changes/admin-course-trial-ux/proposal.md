# admin-course-trial-ux — cấu hình học thử (model B) trên console admin

## Why

Model B định nghĩa học thử = đọc N% mỗi tài liệu (DOCUMENT) + xem video tới X giây
(VIDEO). Console admin cần cấu hình đúng model đó QUA CÁC ENDPOINT SẴN CÓ, không thêm
field BE. Bản giao trước có các lỗi nghiêm trọng bị review chặn:

- **Rò rỉ toàn bộ nội dung**: bật "học thử" ghi kèm cờ `free=true` (PATCH
  `/courses/lessons/{id}`). Ở BE `free=true` = bài MIỄN PHÍ HOÀN TOÀN (FULL access cho
  mọi người) — teaser/percent/seconds không bao giờ chạy, paywall vô hiệu.
- **Nút Tắt luôn 400**: Tắt gửi `null` (một field), nhưng BE `FreemiumService` validate
  "ít nhất một trường" trên record Integer nên body một-field-null = both-null → 400
  `COURSE_VALIDATION`; ngoài ra BE coi `null` = "giữ nguyên", không xoá override về NULL.
- **Mặc định cấp khoá đọc sai key**: FE đọc `previewPercent` nhưng BE serialize
  `defaultPreviewPercent` → % đã lưu không bao giờ hiện lại, dễ ghi đè nhầm.
- **LEGACY mất chỗ sửa giá gốc**: tab "Giá & gói" bị ẩn khi khoá chưa PACKAGE, mà giá gốc
  là cơ chế bán DUY NHẤT của khoá LEGACY.
- **Editor thời lượng học thử trong gói vô tác dụng**: `freeLessonIds` của gói là bài mở
  FULL cho mọi người (teaser), FULL > PREVIEW nên clamp %/giây không bao giờ áp.

## What Changes

- **`LessonTrialConfig`** (học thử theo bài): BỎ HẲN việc ghi cờ `free`. Học thử chỉ do
  `preview_percent` (DOCUMENT) / `preview_seconds` (VIDEO) quyết định. BẬT = ghi giá trị
  `> 0`; TẮT = ghi `0` (tắt tường minh theo BE "0 = tắt"), KHÔNG gửi `null`.
- **`CoursePreviewDefaultConfig`** (mặc định cấp khoá): đọc đúng key
  `defaultPreviewPercent`; TẮT gửi `0` cho cả hai đơn vị (không `null`); nới validate BẬT
  để lưu được chỉ MỘT đơn vị (khoá thuần tài liệu chỉ cần %, khoá thuần video chỉ cần giây).
- **`CourseDetailPage`**: tab "Giá & gói" LUÔN hiển thị (PricingTab tự thích ứng: khu vực
  gói chỉ đọc cho LEGACY, form giá gốc vẫn ghi được).
- **`PricingTab`**: bỏ editor thời lượng học thử theo bài trong gói; đổi nhãn trường thành
  "Mở miễn phí cho mọi người" + tooltip nói rõ đây là mở FULL, không phải học thử cắt %/giây.
- **`LessonListTab`**: cột "Thời gian học thử" hiển thị cả DOCUMENT (% hiệu dụng, kế
  thừa/ghi đè, "Không học thử" khi tắt tường minh); badge trạng thái nội dung chuyển xuống
  cột tiêu đề.

## Cross-repo notes (chưa giải quyết trong repo Admin)

- BE hiện KHÔNG có cơ chế xoá override về NULL. Vì vậy TẮT học thử theo bài = "không cho học
  thử bài này" (0), KHÔNG phải "kế thừa mặc định khoá". Muốn inherit lại cần BE bổ sung cờ
  clear (JsonNullable / `clear*` flag) — ghi nợ, không chặn bản giao này.

## Capabilities

### New Capabilities

- `admin-course-trial-ux`: cấu hình học thử model B theo bài + mặc định cấp khoá, không rò
  rỉ nội dung, dùng đúng semantics BẬT/TẮT của BE.
