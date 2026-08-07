# admin-event-create-repair — Vá đường tạo sự kiện + xoá trang /community/events trùng nguồn

## Why

Nút **"Tạo event"** ở `/operations/events` gửi payload lệch schema DB ở hai chỗ, mỗi chỗ đủ để
request 500 (khảo sát ngày 2026-08-07, `SPEC-LICH-SU-KIEN-COMMUNITY.md` §2.1):

- **`type` chữ thường.** `events.api.ts:268` gửi thẳng `input.type`, mà `OfficialEventType`
  (`operations/shared/types.ts:74`) là union chữ thường `"webinar" | "workshop" | "hackathon"`.
  DB `event.events` có `CHECK (type IN ('WEBINAR','WORKSHOP','HACKATHON','COMPETITION','MEETUP'))`
  và BE **không chuẩn hoá hoa/thường ở bất kỳ đâu** (`EventAdminController.create()` gán thẳng
  `e.setType(req.type())`).
- **`locationType: "OFFLINE"`.** `events.api.ts:275` gửi `"OFFLINE"` khi chọn hình thức offline,
  trong khi DB chỉ nhận `CHECK (location_type IN ('ONSITE','ONLINE','HYBRID'))`. Chuỗi `"ONSITE"`
  không xuất hiện một lần nào trong `src/main/java` của BE.
- **`endAt` để trống được.** `EventWizardModal.tsx:71` không có `rules: required`, còn cột
  `end_at timestamptz NOT NULL` + `CHECK (end_at > start_at)`; `EventService` ném
  `EVENT_INVALID_STATE_TRANSITION` khi `endAt == null`.

Hệ quả: yêu cầu "admin tạo sự kiện hội thảo, đính kèm link Meet kèm ngày giờ" **hôm nay không làm
được qua giao diện Admin**, dù form đã có đủ ô.

Song song đó, `/community/events` (`CommunityEventsPage`) là một trang **trùng nguồn** — cùng gọi
GraphQL `adminEvents` như `/operations/events`, cùng nhãn nav "Events" (khác group: "Cộng đồng" vs
"Vận hành"), nhưng diễn giải status theo một hệ enum không tồn tại ở BE và không có chỗ lưu trạng
thái duyệt thật:

- `Can permissions={["community.moderate"]}` (`CommunityEventsPage.tsx:115`) — chuỗi này xuất hiện
  **đúng 1 lần trong toàn repo**, không thuộc permission catalog đã chuẩn hoá
  (`docs/ADMIN-ARCHITECTURE.md`) → nút Duyệt/Từ chối gần như không bao giờ render.
- `record.status === "pending"` (`:114`) so với status BE trả về là chữ HOA
  (`DRAFT`/`PENDING_APPROVAL`/`PUBLISHED`...) → chặn kép, hàng nào cũng không có nút.
- Mapping hardcode rỗng `groupId:""`, `groupName:""`, `organizerName:""`, `reviewHistory:[]`
  (`community.api.ts:486-494`) → 2 cột bảng luôn trắng, Drawer luôn "—", "Lịch sử duyệt" luôn rỗng.
  `event.events` không có `group_id`, cũng không có bảng review history — không phải thiếu dây, mà
  là **không có dữ liệu để nối**.

## What Changes

### 1. Sửa payload tạo sự kiện (`operations/api/events.api.ts`)

- `type` gửi lên BE dạng **CHỮ HOA** (`input.type.toUpperCase()`). Union FE giữ nguyên chữ thường —
  đó là từ vựng hiển thị/URL query, việc chuẩn hoá làm ở **biên API**, một chỗ duy nhất.
- `locationType` map `mode === "online" ? "ONLINE" : "ONSITE"` — **bỏ hẳn chuỗi `"OFFLINE"`**.
  Quy ước `venue` giữ nguyên: online → link họp, onsite → địa chỉ vật lý.

### 2. "Time kết thúc" thành bắt buộc (`operations/components/EventWizardModal.tsx`)

- `Form.Item name="endAt"` thêm `rules: [{ required: true }]` + validator `endAt > startAt`, khai báo
  `dependencies={["startAt"]}` để đổi giờ bắt đầu thì ô kết thúc validate lại. Sai → chặn ngay trên
  form, **không** gửi request rồi nhận lỗi từ DB.

### 3. Xoá trang `/community/events`

- Xoá `features/community/pages/CommunityEventsPage.tsx`, entry route + nav trong
  `routeRegistry.tsx:449-455`, và khối code chỉ phục vụ nó trong `community.api.ts`
  (`ADMIN_EVENTS_QUERY`, `EventsListParams`, `MOCK_ENABLED_EVENTS`, `mockEvents`,
  `useCommunityEvents`, `useReviewEvent`) + types `CommunityEvent`, `EventReviewStatus`
  (`community/shared/types.ts:142-157`).
- `/operations/events` trở thành **mặt quản trị sự kiện duy nhất**; nhãn nav "Events" hết trùng.

### 4. Chuẩn hoá đường đọc theo cùng quy ước hoa/thường — **phát hiện thêm khi đọc code**

Không nằm trong mô tả ban đầu, nhưng là cùng một lỗi và cùng một dòng sửa: bộ lọc "Loại" ở
`/operations/events` cũng gửi `type` chữ thường vào `adminEvents`, mà BE so khớp **chính xác, phân
biệt hoa thường** (`EventRepository.searchAdmin`: `AND (:type IS NULL OR e.type = :type)`) → lọc theo
loại luôn trả 0 hàng. Sửa create mà bỏ chỗ này thì tạo xong không lọc thấy.

- `useEvents`: gửi `filter.type` chữ HOA; map `item.type` trả về (chữ HOA) ngược lại chữ thường để
  Select/Tag round-trip đúng.
- `useEvent`: cùng cách chuẩn hoá `type` cho trang chi tiết.

## Capabilities

### Modified Capabilities

- `operations-official-events`: payload tạo sự kiện chuẩn hoá theo đúng vocabulary BE
  (`type` chữ HOA, `locationType ∈ {ONLINE, ONSITE}`), thời điểm kết thúc trở thành trường bắt buộc
  có ràng buộc `endAt > startAt` ngay trên form, và bộ lọc theo loại khớp hoa/thường với dữ liệu.

### Removed Capabilities

- `community-events-moderation`: gỡ toàn bộ — trang duyệt sự kiện cộng đồng đọc chung nguồn
  `adminEvents` với trang vận hành, gate bằng permission ngoài catalog, và không có dữ liệu
  group/organizer/review-history để hiển thị.

## Impact

- FE files sửa: `src/features/operations/api/events.api.ts` (payload create + chuẩn hoá `type` hai
  chiều), `src/features/operations/components/EventWizardModal.tsx` (rule `endAt`),
  `src/app/routeRegistry.tsx` (−1 import, −1 route/nav),
  `src/features/community/api/community.api.ts` (−khối events),
  `src/features/community/shared/types.ts` (−`CommunityEvent`, −`EventReviewStatus`).
- FE files xoá: `src/features/community/pages/CommunityEventsPage.tsx`.
- API BE tiêu thụ: `POST /api/v1/event/admin/events` (qua `coreClient`, gate `event.manage`) —
  **không đổi endpoint, chỉ đổi giá trị field**; GraphQL `adminEvents` / `adminEvent`
  (gate `admin.event.read`) — chỉ đổi giá trị filter.
- API BE **thôi tiêu thụ**: `POST /api/v1/admin/events/{id}/review` — `useReviewEvent` là caller duy
  nhất trong Admin. Xem "Hệ quả cần biết" bên dưới.
- Permission: route `/operations/events` giữ `["event.manage", "admin.event.read"]`. Chuỗi
  `community.moderate` biến mất khỏi repo. `admin.community.read` không mất route nào khác
  (`/community/posts`, `/community/groups`, `/moderation/*` vẫn dùng).
- KHÔNG đổi BE, KHÔNG thêm migration.
- **Sửa kèm phần chữ của spec cũ:** requirement "Official event creation and lifecycle" trong
  `openspec/specs/operations-official-events/spec.md` đang ghi permission `operations.event.manage`
  và các endpoint `/api/v1/admin/operations/events/*` — cả hai **không tồn tại** trong code lẫn BE
  (route gate `event.manage` + `admin.event.read`, lifecycle đi `POST /api/v1/event/admin/events/{id}/submit|cancel`).
  Vì delta `MODIFIED` thay nguyên khối requirement, bản viết lại chép theo thực tế thay vì chép lại
  chữ sai. Không đổi hành vi, chỉ đổi tài liệu.

## Hệ quả cần biết (không tự sửa trong change này)

1. **Mất mặt duyệt sự kiện.** `useReviewEvent` là chỗ duy nhất trong Admin gọi
   `POST /api/v1/admin/events/{id}/review` (approve/reject). `/operations/events` chỉ có `submit`
   (→ chờ duyệt) và `cancel` — **không có nút Duyệt**. Xoá trang xong, sự kiện nằm ở
   `PENDING_APPROVAL` không có đường lên `PUBLISHED` qua giao diện. Đây là lỗ hổng đã tồn tại
   (nút cũ vốn không render vì gate sai permission), change này chỉ làm nó lộ ra. Đề xuất change
   tiếp theo: `admin-event-approve-action` — thêm nút "Duyệt" vào `EventDetailPage` gate
   `admin.event.manage`, dùng lại endpoint `review`.
2. **Onsite hiển thị rỗng cho tới khi BE vá.** `AdminContentReadController.adminEvent()` map
   `mode`/`location` bằng `"OFFLINE".equalsIgnoreCase(...)`; sự kiện ghi đúng `ONSITE` sẽ về
   `mode = null`, `location = null` → trang chi tiết hiện "Hình thức: —", "Link/Địa điểm: —".
   Chỗ sửa nằm ở repo BE (`SPEC-LICH-SU-KIEN-COMMUNITY.md` §1.5, change `event-write-path-repair`),
   **không** ở Admin. Sự kiện online không dính vì nhánh `ONLINE` vốn đã đúng.

## Không làm (cắt phạm vi có chủ đích)

| Cắt | Vì sao / khi nào làm |
|---|---|
| Thêm nút "Duyệt" ở `EventDetailPage` | Là hành vi MỚI, không phải vá lỗi — tách change riêng (xem trên) |
| `community.api.ts` thêm `handleAdminMutationError` | Đúng, còn thiếu thật (§5.3 spec gốc), nhưng chạm mọi mutation community → change riêng |
| Xoá mock chết `mockPosts`/`mockGroups`/`getGroupDetail` | §5.4 spec gốc; change này chỉ gỡ đúng phần `mockEvents` đi theo trang bị xoá |
| Đổi `OfficialEventType` sang chữ HOA | Sẽ lan sang `TYPE_OPTIONS`, Select lọc, và query param trên URL. Chuẩn hoá ở biên API rẻ hơn và gói gọn một file |
| Bổ sung `COMPETITION`/`MEETUP` vào picker loại | DB cho phép, nhưng chưa có yêu cầu sản phẩm |
| Sửa BE (`EventAdminController` validate 400, `AdminContentReadController` `ONSITE`) | Repo khác, change `event-write-path-repair` |
