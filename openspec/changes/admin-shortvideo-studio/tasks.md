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
- [x] 2.6 `useClip` (`GET /clips/{id}`) — endpoint còn lại của hợp đồng §3, để Drawer đọc bản mới
      thay vì giữ ảnh chụp lúc bấm

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
- [x] 4.6 Nút "Xem chi tiết" tường minh trên `MobileCard`: nhánh mobile của `ResponsiveTable` KHÔNG
      chuyển tiếp `onRow`, thiếu nút thì Drawer không có đường mở trên điện thoại
- [x] 4.7 Drawer bám ID (`useClip`) chứ không giữ đối tượng clip; dòng trong bảng chỉ là bản dự phòng
- [x] 4.8 `loading` của bảng chỉ dùng `isLoading`: `isFetching` của vòng poll làm nhánh mobile thay
      cả danh sách bằng khung xương — việc chạy nền báo ở nút "Làm mới"
- [x] 4.9 Publish/Gỡ và "Cắt clip" chỉ quay ở đúng dòng/thẻ đang gửi (`variables?.id`)
- [x] 4.10 Nút "Xem chi tiết" có mặt ở CẢ cột "Thao tác" trên laptop (không chỉ thẻ điện thoại):
      click-cả-hàng là lối tắt vô hình và bàn phím không tới được; hàng bấm được thì `cursor:pointer`
- [x] 4.11 `ClipDetailDrawer` đóng là VỨT nội dung (`destroyOnHidden`): antd chỉ `display:none`, mà
      `<video>` bị ẩn vẫn phát tiếp — đóng Drawer xong tiếng chạy sau lưng, không còn nút nào tắt
- [x] 4.12 Đề xuất đã gửi cắt thì khoá nút + gắn dấu "Đã gửi cắt" (`POST /clips` không hứa
      idempotent); sửa mốc/tiêu đề là mở lại vì đó là một clip khác

## 5. Route + responsive
- [x] 5.1 `/content/shortvideo` trong `routeRegistry` với `requiredPermissions:["shortvideo.manage"]`
- [x] 5.2 `useIsMobile`: nút full-width, `MobileCard`, `scroll={{x:"max-content"}}`, `Drawer`

## 6. Verify
- [x] 6.1 Unit: `timecode.test.ts` (mm:ss ↔ ms, luật chặn khoảng)
- [x] 6.2 Unit: `api/clipPage.test.ts` (3 vỏ phân trang, trang 1-based → 0-based)
- [x] 6.3 Render: `ShortVideoStudioPage.test.tsx` (rỗng / đang tải / lỗi, lối mở chi tiết trên điện
      thoại VÀ trên laptop, chi tiết đọc lại theo id, đóng Drawer là gỡ hẳn khung xem thử, làm mới
      nền không xoá trắng danh sách)
- [x] 6.4b Unit: `HighlightSuggestionCard.test.tsx` (chữ ký chống cắt trùng: bấm lại y nguyên không
      gửi lần hai, sửa mốc thì mở lại)
- [x] 6.4 `npm run build` (tsc -b && vite build) xanh + `npx vitest run`
- [ ] 6.5 Thử THẬT với BE `shortvideo` khi module đó lên (chưa làm được — BE đang viết song song)
