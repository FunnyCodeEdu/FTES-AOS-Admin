# Design — admin-event-create-repair

## 1. Route & màn hình

| Route | Layout | Trạng thái sau change | Ghi chú |
|---|---|---|---|
| `/operations/events` | `admin` | **Giữ** — mặt quản trị sự kiện duy nhất | `EventsPage` + `EventWizardModal` |
| `/operations/events/:eventId` | `admin` | Giữ nguyên | `EventDetailPage` |
| `/community/events` | `admin` | **XOÁ** (route + nav + page) | Trùng nguồn `adminEvents` |

Sau khi xoá, nhóm nav "Cộng đồng" còn `Posts`, `Groups`, `Moderation Queue`, `Workflow`, `Mod Log`;
nhãn "Events" chỉ còn một chỗ duy nhất ở nhóm "Vận hành".

### `EventWizardModal` — phần đổi

Chỉ đổi ràng buộc của một `Form.Item`, không đổi bố cục:

```
Loại            [Select: Webinar | Workshop | Hackathon]     * (đã bắt buộc)
Tiêu đề         [Input]                                       * (đã bắt buộc)
Mô tả           [TextArea]
Time bắt đầu    [DatePicker showTime]                         * (đã bắt buộc)
Time kết thúc   [DatePicker showTime]                         * ← THÀNH BẮT BUỘC + endAt > startAt
Hình thức       ( ) Online   ( ) Offline                      * (đã bắt buộc)
  ├ online  → Link online   [Input]  *
  └ offline → Địa điểm      [Input]  *
Sức chứa / Cấp certificate / Cấp reward                        (giữ nguyên)
```

Nhãn radio "Offline" giữ nguyên (từ vựng người dùng); chỉ **giá trị gửi lên BE** đổi thành `ONSITE`.

## 2. Permission gates

| Bề mặt | Gate | Hành vi khi thiếu |
|---|---|---|
| Route `/operations/events`, `/operations/events/:id` | `["event.manage", "admin.event.read"]` — **không đổi** | Ẩn nav + `/403` |
| Nút "Tạo event" | `<Can permissions={["event.manage"]}>` — không đổi | Không render |
| ~~`/community/events`~~ | ~~`["admin.community.read"]`~~ | Route biến mất → `/404` theo hành vi mặc định của registry |
| ~~Nút Duyệt/Từ chối~~ | ~~`community.moderate`~~ | Chuỗi này bị xoá khỏi repo |

`community.moderate` **không thuộc permission catalog** (`docs/ADMIN-ARCHITECTURE.md`) — nó chỉ tồn
tại ở đúng file bị xoá. Không có preset role nào cấp nó, nên xoá không làm ai mất quyền đang dùng.
CTV không chịu ảnh hưởng: `event.manage` vốn không nằm trong preset CTV/Moderator.

## 3. API contract tiêu thụ

### 3.1 Tạo sự kiện — `POST /api/v1/event/admin/events`

Đi qua `coreClient` (base `/api/v1`, **không** phải `/api/v1/admin`), gate BE `event.manage`.
Envelope `{code, message, data}`.

| Field | Trước | Sau | Ràng buộc BE |
|---|---|---|---|
| `type` | `"webinar"` | `"WEBINAR"` | `CHECK (type IN ('WEBINAR','WORKSHOP','HACKATHON','COMPETITION','MEETUP'))` |
| `locationType` | `"OFFLINE"` \| `"ONLINE"` | `"ONSITE"` \| `"ONLINE"` | `CHECK (location_type IN ('ONSITE','ONLINE','HYBRID'))` |
| `endAt` | có thể `undefined` | luôn có, ISO-8601 | `end_at NOT NULL`, `CHECK (end_at > start_at)` |
| `venue` | link (online) / địa chỉ (offline) | **không đổi** | quy ước hiện hành của hệ |
| `title`, `slug`, `description`, `startAt`, `capacity`, `waitlistEnabled`, `checkinOpenBeforeMinutes`, `attendanceMinMinutes`, `rewardXp`, `rewardCoin`, `certificateEnabled` | | **không đổi** | |

> **Assumption (chưa chạy runtime):** kết luận đọc từ `V73__event_system_schema.sql` và
> `EventAdminController.create()`. BE hiện **không** chuẩn hoá hoa/thường và **không** validate tập
> giá trị → chuỗi sai rơi xuống `DataIntegrityViolationException` thành **500**, không phải 400.
> Việc trả 400 là phần của change BE `event-write-path-repair`; Admin không dựa vào nó.

### 3.2 Đọc — GraphQL `adminEvents` / `adminEvent`

Gate `admin.event.read`. Filter `type` so khớp **chính xác, phân biệt hoa thường** ở BE
(`EventRepository.searchAdmin`: `AND (:type IS NULL OR e.type = :type)`) → phải gửi chữ HOA.
Response trả `type` chữ HOA → map ngược về chữ thường trước khi vào state FE.

### 3.3 Thôi tiêu thụ

`POST /api/v1/admin/events/{id}/review` (`useReviewEvent`) — mất caller cuối cùng ở Admin.
Endpoint BE vẫn còn, không xoá gì bên đó. Hệ quả ghi ở `proposal.md` §"Hệ quả cần biết".

## 4. State & data

- Query key `/operations/events` giữ nguyên: `["ops","events",params]`, `["ops","events",id]`.
  `useCreateEvent.onSuccess` vẫn invalidate `["ops","events"]`.
- **Xoá** key `["community","events", ...]` cùng `useCommunityEvents`/`useReviewEvent`.
  Không component nào khác dùng key này (grep `"community", "events"` chỉ ra 2 chỗ trong
  `community.api.ts`).
- Chuẩn hoá `type` là **hàm thuần, không state**: đặt cạnh `slugify`/`stableSuffix` trong
  `events.api.ts` để mọi đường ra/vào dùng chung một chỗ.
- Không thêm store Zustand, không đổi cache time.

## 5. Luồng nghiệp vụ chính

### 5.1 Tạo sự kiện hội thảo online có link Meet (happy path)

1. Admin (`event.manage`) mở `/operations/events` → "Tạo event".
2. Chọn Loại = Webinar, nhập tiêu đề, chọn **cả** giờ bắt đầu và giờ kết thúc, Hình thức = Online,
   dán link Meet vào "Link online".
3. `validateFields()` qua → `handleOk` dựng `schedule.startAt`/`schedule.endAt` bằng `toISOString()`.
4. `useCreateEvent` gửi `{type:"WEBINAR", locationType:"ONLINE", venue:"<link Meet>", startAt, endAt, ...}`.
5. BE trả `200` + sự kiện ở trạng thái `DRAFT` → `message.success("Đã tạo event")`, đóng modal,
   invalidate list.

### 5.2 Nhánh lỗi: bỏ trống hoặc đặt sai giờ kết thúc

- Bỏ trống → `Form.Item` báo "Vui lòng chọn time kết thúc", `validateFields()` reject,
  **không** gửi request.
- `endAt <= startAt` → validator báo "Time kết thúc phải sau time bắt đầu", chặn tại form.
- Đổi `startAt` sang sau `endAt` đã nhập → nhờ `dependencies={["startAt"]}`, ô kết thúc validate lại
  và hiện lỗi ngay, không đợi bấm "Tạo".

### 5.3 Nhánh lỗi: BE từ chối payload

`onError: handleAdminMutationError` (đã có sẵn trong `useCreateEvent`) + `message.error` ở
`EventsPage.handleCreate` — modal **giữ nguyên trạng thái nhập**, người dùng sửa và gửi lại.
Sau change BE `event-write-path-repair`, lỗi enum sẽ về 400 kèm mã rõ ràng thay vì 500 chung chung.

### 5.4 Tạo sự kiện offline

Giống 5.1, khác ở bước 2 chọn Hình thức = Offline và nhập "Địa điểm"; payload đi
`locationType:"ONSITE"`, `venue:"<địa chỉ>"`.
**Lưu ý nghiệm thu:** trang chi tiết sẽ hiện "Hình thức: —" cho tới khi BE vá
`AdminContentReadController` (§1.5 spec gốc) — dữ liệu trong DB vẫn đúng, chỉ đường đọc GraphQL còn
so `"OFFLINE"`. Kiểm chứng bằng `psql` hoặc `GET /api/v1/events` chứ đừng kết luận theo màn hình.

### 5.5 Người dùng vào thẳng `/community/events` (bookmark cũ)

Route không còn trong registry → rơi vào nhánh not-found mặc định. Không redirect: URL này chưa từng
hoạt động đúng (nút duyệt không render, cột trống), giữ redirect chỉ dựng lại kỳ vọng sai.

## 6. UX states

| Trạng thái | Xử lý |
|---|---|
| Loading list | `Table loading` — giữ nguyên |
| Empty | Empty mặc định của `Table` — giữ nguyên |
| Error | `Alert` + nút "Thử lại" — giữ nguyên |
| Validate form | Lỗi hiện dưới đúng ô (`endAt`), không dùng `message.error` toàn cục |
| Submit | `confirmLoading` trên modal — giữ nguyên |
| Destructive | Change này không thêm hành động phá huỷ nào ở runtime |
