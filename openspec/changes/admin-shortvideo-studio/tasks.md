# Tasks — admin-shortvideo-studio

## 1. Nền: kiểu dữ liệu + luật mốc thời gian
- [x] 1.1 `types.ts` bám đúng hợp đồng chung (`HighlightJob`, `HighlightSuggestion`, `Clip`,
      trạng thái `RUNNING|READY|FAILED` và `QUEUED|RENDERING|READY|FAILED`)
- [x] 1.2 `timecode.ts`: `formatMmSs` / `parseMmSs` / `checkClipRange` / `MAX_CLIP_MS = 180_000`
- [x] 1.3 `format.ts`: nhãn + màu Tag trạng thái clip, `formatDateTime`

## 2. Lớp API
- [x] 2.1 `shortvideo.keys.ts` (query-key factory, mirror `payroll.keys`)
- [x] 2.2 `shortvideo.api.ts`: `useClips`, `useCreateHighlights`, `useHighlightJob`,
      `useCreateClip`, `useDeleteClip`, `usePublishClip`, `useUnpublishClip` qua `apiClient`
- [x] 2.3 `clipPage.ts`: đọc được cả `[]`, `{items,total}` và `{content,totalElements}` (vỏ phân
      trang của BE chưa chốt trong hợp đồng)
- [x] 2.4 Poll CHỈ khi còn clip `QUEUED`/`RENDERING`, dừng hẳn khi mọi dòng đã terminal
- [x] 2.5 `SHORTVIDEO_NO_TRANSCRIPT` vào bảng dịch lỗi admin

## 3. Phần "Tạo clip"
- [x] 3.1 `CreateClipPanel`: `CourseSelect` → select bài học lọc `lessonType === "VIDEO"`
- [x] 3.2 `videoId` suy từ `useLessonStream(lessonId).videoRef`; nói rõ ca YouTube / chưa gắn video
- [x] 3.3 `HighlightSuggestionCard`: tiêu đề sửa được, lý do, `ClipRangeEditor`, nút "Cắt clip"
- [x] 3.4 `ClipRangeEditor` chặn tại chỗ: sai định dạng, end ≤ start, < 1s, > 180s, vượt thời lượng

## 4. Phần "Studio"
- [x] 4.1 `ClipStudioPanel`: `ResponsiveTable` (tiêu đề, khoá/bài, độ dài, trạng thái, ngày tạo)
- [x] 4.2 Tải về (link thẳng `clipUrl`), Publish/Gỡ (chỉ bật khi `READY`), Xoá
- [x] 4.3 Xoá qua `DeleteConfirmModal` + cảnh báo "sẽ gỡ luôn tin đã đăng"
- [x] 4.4 Lọc theo khoá + trạng thái, phân trang, nút Làm mới
- [x] 4.5 `ClipDetailDrawer` (video 16:9, mốc gốc, dung lượng, lỗi) — bottom sheet trên điện thoại

## 5. Route + responsive
- [x] 5.1 `/content/shortvideo` trong `routeRegistry` với `requiredPermissions:["shortvideo.manage"]`
- [x] 5.2 `useIsMobile`: nút full-width, `MobileCard`, `scroll={{x:"max-content"}}`, `Drawer`

## 6. Verify
- [x] 6.1 Unit: `timecode.test.ts` (mm:ss ↔ ms, luật chặn khoảng)
- [x] 6.2 Unit: `api/clipPage.test.ts` (3 vỏ phân trang, trang 1-based → 0-based)
- [x] 6.3 Render: `ShortVideoStudioPage.test.tsx` (rỗng / đang tải / lỗi)
- [x] 6.4 `npm run build` (tsc -b && vite build) xanh + `npx vitest run`
- [ ] 6.5 Thử THẬT với BE `shortvideo` khi module đó lên (chưa làm được — BE đang viết song song)
