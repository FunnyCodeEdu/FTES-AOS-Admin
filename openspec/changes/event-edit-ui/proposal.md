# event-edit-ui — Nối giao diện sửa sự kiện đã tạo

## Why

Sự kiện tạo xong **không sửa được**. Gõ sai tiêu đề, dời giờ, đổi link Meet — cách duy nhất hiện nay
là huỷ rồi tạo lại (mất registrations, mất id, mất mọi thứ đã gắn theo sự kiện).

Khảo sát ngày 2026-08-10:

- `EventDetailPage` chỉ có **Gửi duyệt** và **Huỷ event** trong khối `<Can permissions={["event.manage"]}>`;
  không có nút nào dẫn tới một form sửa.
- `events.api.ts` không có mutation update nào — chỉ `useCreateEvent`, `useTransitionEvent`
  (submit/cancel), `useReviewEvent`, `useUpdateRecording`, `useIssueCertificates`, `useManualCheckIn`.
- `EventWizardModal` là form **một chiều**: không nhận giá trị vào, tiêu đề cứng "Tạo event vận hành",
  nút cứng "Tạo".
- Đường ghi phía BE: module `event` (`EventAdminController`, base `/api/v1/event/admin`) chưa bao giờ
  có PATCH; đường `/api/v1/admin/events` (`EventCommandApi.update`) từng tồn tại nhưng đã bị xoá ở
  `c54bb7f` vì là code chết không caller và mang bug (hardcode `type="WORKSHOP"`, ghi
  `locationType="OFFLINE"` vi phạm CHECK constraint).

Change này làm **phía Admin**: hook, form, nút. Endpoint `PATCH /api/v1/event/admin/events/{id}`
được dựng lại ở repo BE (module `event`, cạnh create, cùng gate `event.manage` scoped `EVENT`) —
nằm ngoài phạm vi change này nhưng là điều kiện để nghiệm thu.

## What Changes

### 1. `useUpdateEvent` (`features/operations/api/events.api.ts`)

- `coreClient.patch("/event/admin/events/{id}", body)` — **coreClient** (base `/api/v1`) như
  create/submit/cancel/recording, không phải `apiClient` (base `/api/v1/admin`, module admin, chỗ của
  `review`). Invalidate `["ops","events",id]` + `["ops","events"]`; `onError: handleAdminMutationError`.
- Body dùng **đúng từ vựng của create**: `type` CHỮ HOA, `locationType ∈ {ONLINE, ONSITE}` — chuỗi
  `"OFFLINE"` không xuất hiện, `venue` theo hình thức (online → link họp, offline → địa chỉ).
- **PATCH partial**: chỉ field người dùng thực sự đổi mới có mặt trong body. Field không đổi **vắng
  mặt** (không gửi `null` — BE hiểu null là "không đổi", gửi thừa chỉ là nhiễu).
- So mốc thời gian theo **thời điểm** chứ không theo chuỗi: BE trả `…T10:00:00Z`, `dayjs.toISOString()`
  cho `…T10:00:00.000Z` — so chuỗi thì lần lưu nào cũng gửi thừa `startAt`/`endAt`.

### 2. `EventWizardModal` chạy cả hai chế độ

- Thêm prop optional `initial`. **Có `initial` = chế độ sửa**, không có = chế độ tạo — suy ra từ dữ
  liệu thay vì thêm prop `mode`, vì form đã có một field tên `mode` (online/offline).
- Tiêu đề "Sửa event vận hành" / nút "Lưu thay đổi" thay cho "Tạo event vận hành" / "Tạo".
- Prefill: `type`, `title`, `description`, `startAt`/`endAt` (dayjs), `mode`, `location`/`onlineLink`,
  `capacity`. Nạp một lần mỗi lần mở modal — không phụ thuộc tham chiếu `initial`, kẻo một nhịp
  refetch giữa chừng ghi đè thứ người dùng đang gõ.
- Validate giữ nguyên: `endAt` bắt buộc và phải sau `startAt`.
- Certificate/reward **ẩn ở chế độ sửa**: đường PATCH không mang hai field đó, để switch lại thì gạt
  xong bấm Lưu sẽ không có gì thay đổi — điều khiển giả.
- Export `toEventWizardValues(event)`: sự kiện ở đường đọc → giá trị form. Cùng một hàm dùng cho cả
  prefill lẫn **mốc so sánh** của PATCH partial; mốc lệch khuôn với giá trị form sẽ đẻ ra field "đổi" giả.

### 3. Nút "Sửa" ở `EventDetailPage`

- Nằm trong khối `<Can permissions={["event.manage"]}>` sẵn có, cạnh Gửi duyệt / Huỷ event.
- Hiện khi status ∈ `draft | pending_approval | published`. **Không** hiện với `ongoing`
  (đang diễn ra mà đổi giờ/địa điểm là đánh lừa người đã check-in), `ended`, `cancelled` — BE cũng chặn.

### 4. `type` hạ chữ thường ở biên đọc — **phát hiện thêm khi đọc code**

Không nằm trong mô tả ban đầu nhưng chặn thẳng việc prefill: `useEvents`/`useEvent` đang map
`item.type as OfficialEvent["type"]` — cast **không sinh mã runtime**, nên `"WEBINAR"` của BE lọt
thẳng vào state. Ô "Loại" của form sửa dùng option chữ thường (`webinar`/`workshop`/`hackathon`) nên
prefill bằng `"WEBINAR"` sẽ không khớp option nào.

Đây đúng là hành vi mà spec `operations-official-events` (đã archive cùng `admin-event-create-repair`)
đã yêu cầu — *"SHALL lowercase the `type` returned by `adminEvents` and `adminEvent` before it reaches
component state"* — nhưng code không làm. Thêm `toUiEventType` ở cùng chỗ với `toEventStatus`.

## Capabilities

### Modified Capabilities

- `operations-official-events`: sự kiện đã tạo sửa được qua giao diện — cùng wizard với đường tạo,
  gửi `PATCH /api/v1/event/admin/events/{id}` chỉ mang những field thực sự đổi, theo đúng từ vựng BE.

## Impact

- FE files sửa: `src/features/operations/api/events.api.ts` (+`useUpdateEvent`, +`toUiEventType`),
  `src/features/operations/components/EventWizardModal.tsx` (chế độ sửa + `toEventWizardValues`),
  `src/features/operations/pages/EventDetailPage.tsx` (nút Sửa + modal),
  `src/features/operations/api/events.api.test.ts` (+9 test).
- API BE tiêu thụ **mới**: `PATCH /api/v1/event/admin/events/{id}` (gate `event.manage`, scoped
  `EVENT`). Chưa tồn tại ở thời điểm viết change này — xem "Phụ thuộc" bên dưới.
- Permission: không thêm chuỗi mới; dùng lại `event.manage` đã có ở khối hành động.
- KHÔNG đổi route, KHÔNG đổi nav, KHÔNG migration.

## Phụ thuộc (ngoài repo này)

`PATCH /api/v1/event/admin/events/{id}` phải có ở BE, đặt trong module `event` cạnh `create`, dùng lại
`requireType`/`normalizeLocationType`/`normalizeEnum` của `EventAdminController`, và phát
`event.updated` qua `EventPublisher.publishEvent` — handler đánh index ở
`search/service/EventMappingRegistry:73` hiện **không có ai phát** (publisher bị xoá cùng
`EventCommandApiImpl.update`), tức là handler chết. Trước khi có endpoint đó, nút Sửa gửi request và
nhận 404/405; nghiệm thu §5 chờ BE.

## Không làm (cắt phạm vi có chủ đích)

| Cắt | Vì sao / khi nào làm |
|---|---|
| Sửa certificate/reward qua PATCH | Body update không mang field đó; thêm thì phải kéo cả `certificateEnabled`/`rewardXp` ở BE — change riêng |
| Ô chọn hình thức HYBRID | DB cho phép (CHECK `location_type`), picker chưa có; change này chỉ bảo toàn: không đụng ô Hình thức thì `locationType` không được gửi ⇒ HYBRID giữ nguyên |
| Xoá trắng `capacity` | Hợp đồng BE: null = không đổi ⇒ không có cách diễn đạt "xoá". Cần `capacity: 0` hoặc cờ riêng — chưa có yêu cầu sản phẩm |
| Sửa từ danh sách `/operations/events` | Một cửa vào là đủ; danh sách chưa có đủ field để prefill (`adminEvents` không trả description/mode/venue/capacity) |
| Bổ sung `COMPETITION`/`MEETUP` vào picker loại | `toUiEventType` giữ nguyên giá trị lạ để hiển thị, nhưng thêm option là quyết định sản phẩm |
