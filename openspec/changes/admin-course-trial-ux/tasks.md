# Tasks — admin-course-trial-ux

> Dùng endpoint SẴN CÓ (course-freemium-preview): PATCH `/lessons/{id}/preview`,
> PATCH `/courses/{courseId}/preview-default`, GET `/lessons/{id}/preview`,
> GET `/courses/{courseId}/preview-default`. KHÔNG thêm field BE.

## 1. Học thử theo bài (LessonTrialConfig)
- [x] 1.1 Bỏ `updateMeta.mutate({ free })` — không bao giờ ghi cờ `free` từ công tắc học thử
- [x] 1.2 TẮT gửi `0` (không `null`); BẬT gửi giá trị `> 0`; cập nhật doc + help text

## 2. Mặc định cấp khoá (CoursePreviewDefaultConfig + types)
- [x] 2.1 `types`: `CoursePreviewDefault.previewPercent` → `defaultPreviewPercent` (đúng key BE)
- [x] 2.2 Đọc state từ `defaultPreviewPercent`; TẮT gửi `{ percent: 0, seconds: 0 }`
- [x] 2.3 Nới validate BẬT: chỉ cần ít nhất MỘT đơn vị `> 0`; đơn vị trống không gửi

## 3. Điều hướng & gói (CourseDetailPage + PricingTab)
- [x] 3.1 Tab "Giá & gói" luôn hiển thị; bỏ query gói dùng để gate
- [x] 3.2 Bỏ `TrialLessonRow`/`PackageTrialDurations`; đổi nhãn "Mở miễn phí cho mọi người" + tooltip

## 4. Danh sách bài học (LessonListTab)
- [x] 4.1 `PreviewTooltip` phủ DOCUMENT (% hiệu dụng, kế thừa/ghi đè, "Không học thử" khi 0)
- [x] 4.2 Chuyển `ContentBadge` sang cột tiêu đề

## 5. Nghiệm thu
- [x] 5.1 `npm run build` xanh (tsc -b + vite build) — 2026-07-26
- [ ] 5.2 E2E apitest: bật học thử 10% cho bài DOCUMENT → học viên chưa mua đọc teaser + paywall,
      KHÔNG lộ toàn bộ; tắt → bài không mở học thử; mặc định cấp khoá bật %/giây rồi tắt → không 400
- [ ] 5.3 Cross-repo (ghi nợ): BE bổ sung cơ chế clear override về NULL để TẮT = kế thừa mặc định
