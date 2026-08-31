# admin-story-expiry-badge — Studio nói đúng thứ người học đang thấy

## Why

Cộng đồng vừa chốt: tin chỉ hiện **24 giờ** kể từ lúc đăng rồi ẩn (change `community-story-24h-window`
bên FTES-AOS-Community). Bản ghi vẫn còn nên clip bên Studio vẫn giữ `publishedStoryId` — và Studio
hiện đang đọc đúng cờ đó để dán nhãn "Đang trên mục Tin".

Nghĩa là sau 24 giờ Studio khẳng định một điều không còn đúng: tin đã biến mất khỏi trang cộng đồng
mà bảng vẫn báo đang hiện. Admin mở trang cộng đồng không thấy clip đâu, đi báo lỗi một hệ thống đang
chạy đúng — và cách "chữa" tự nhiên nhất của họ là bấm Gỡ rồi Publish lại, tức làm đúng thao tác mà
lẽ ra chỉ cần biết là nó đã hết hạn.

## What Changes

- `format.ts`: thêm `STORY_VISIBLE_HOURS = 24` và `storyVisibility(clip)` trả `NONE | LIVE | EXPIRED`,
  suy từ `publishedStoryId` + `publishedAt` (backend đã trả sẵn cả hai).
- `ClipStudioPanel`: nhãn "Đang trên mục Tin" chỉ còn hiện khi `LIVE`; quá hạn thì hiện thẻ xám
  "Đã hết 24h hiển thị". Nút Gỡ/Publish giữ nguyên — gỡ một tin quá hạn vẫn là thao tác hợp lệ.
- Thiếu `publishedAt` (dữ liệu cũ) thì coi như còn hiện: thà thiếu một cảnh báo còn hơn dán nhãn
  "hết hạn" lên một tin vẫn đang chạy.

Con số 24 ở đây là bản SAO để nói lại cho admin; nơi quyết định vẫn là `StoryService.VISIBLE_WINDOW`
bên community.

## Impact

Admin-only. Sửa `features/content/shortvideo/format.ts` + `components/ClipStudioPanel.tsx`, thêm
`storyVisibility.test.ts` (5 test). Không đổi API.

`npm run build` xanh, `vitest` xanh.

## Capabilities

### Modified Capabilities

- `admin-shortvideo-studio`: phân biệt tin đang hiện với tin đã hết hạn hiển thị.
