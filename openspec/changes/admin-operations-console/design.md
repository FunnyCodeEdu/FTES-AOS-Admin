# Design — admin-operations-console

## 1. Route & màn hình

| Route | Màn hình | Layout / thành phần chính |
|---|---|---|
| `/operations/notifications` | Notification Broadcast | 2 tab: **Soạn broadcast** (form: title, content rich-text, channel in-app/email/push, target segment builder campus/subject/role, schedule ngay/hẹn giờ, nút Preview) và **Lịch sử** (bảng server-side pagination: trạng thái draft/scheduled/sending/sent, stats sent/delivered/read, action xem detail/hủy scheduled) |
| `/operations/banners` | Banner Management | Bảng banner server-side pagination + filter vị trí/trạng thái; modal CRUD (ảnh upload, link, vị trí home-hero/sidebar/subject-top, khoảng hiệu lực, thứ tự); preview panel render đúng khung vị trí |
| `/operations/announcements` | Announcements | Bảng announcement + filter phạm vi (system / subject / group) + trạng thái; modal CRUD (nội dung, phạm vi + chọn subject/group, mức độ info/warning/critical, schedule) |
| `/operations/events` | Official Events | Bảng event vận hành (webinar/workshop/hackathon) + filter loại/trạng thái + search; nút Tạo event (modal wizard: thông tin, thời gian, hình thức online/offline, capacity, cấu hình certificate/rewards) |
| `/operations/events/:eventId` | Event Detail | Tabs: Overview (status lifecycle draft→published→ongoing→completed→cancelled), Registrations (bảng đăng ký + search + export), Check-in (QR code hiển thị + bảng attendance realtime-ish refetch), Recording (link/upload), Certificates & Rewards (cấp hàng loạt cho attendee đạt điều kiện) |
| `/operations/flags` | Feature Toggles | Bảng flag: key, mô tả, trạng thái per môi trường (dev/staging/prod), rollout %, target segment; toggle switch + modal chỉnh rollout/target; banner cảnh báo môi trường prod |
| `/operations/config` | System Configuration | Cây/nhóm config theo domain; editor từng key (typed input theo kiểu giá trị); nút Lưu mở modal **diff before/after** + lý do; lịch sử thay đổi gần nhất |

## 2. Permission gates

| Permission | Gate |
|---|---|
| `operations.notification.view` | Nav + route `/operations/notifications` (tab lịch sử) |
| `operations.notification.send` | Tab soạn + nút Gửi/Schedule/Hủy scheduled |
| `operations.banner.manage` | Nav + route `/operations/banners` + mọi CRUD banner |
| `operations.announcement.manage` | Nav + route `/operations/announcements` + CRUD |
| `operations.event.manage` | Nav + route `/operations/events*` + tạo/sửa/lifecycle event |
| `operations.event.checkin` | Tab Check-in + hành động check-in thủ công (cấp được cho staff sự kiện) |
| `operations.event.certificate` | Tab Certificates & Rewards + cấp certificate/reward |
| `system.flag.manage` | Nav + route `/operations/flags` + mọi thao tác flag (preset: Super Admin, admin-operations) |
| `system.config.manage` | Nav + route `/operations/config` + editor (preset: CHỈ Super Admin; user khác kể cả admin-operations → 403) |

Thiếu quyền: nav ẩn, URL trực tiếp → 403 page kèm permission thiếu, nút không render.
Moderator/CTV không có leaf `operations.*` nào trong preset — toàn bộ console ngoài scope của họ;
scoped grant KHÔNG áp dụng cho mảng operations (không có scopeType tương ứng).

## 3. API contract tiêu thụ

Envelope `{code, message, data|null}`. **Assumption**: nhóm endpoint operations chưa có đầy đủ trong
change `admin-api` bên FTES-AOS-Backend — các dòng đánh dấu (A) cần BE bổ sung spec.

| Method | Path | Quyền | Request / Response chính |
|---|---|---|---|
| GET | `/api/v1/admin/operations/notifications` | `operations.notification.view` | Query: `page,pageSize,status,search` → `data: {items: Broadcast[], total}` (mỗi item có stats `{sent,delivered,read}`) |
| POST | `/api/v1/admin/operations/notifications/preview` (A) | `operations.notification.send` | Body: `{segment: {campusIds?, subjectIds?, roles?}}` → `data: {recipientCount, sample: UserBrief[]}` |
| POST | `/api/v1/admin/operations/notifications` | `operations.notification.send` | Body: `{title, content, channels[], segment, scheduleAt?}` → `data: Broadcast` |
| POST | `/api/v1/admin/operations/notifications/:id/cancel` (A) | `operations.notification.send` | Chỉ khi status=scheduled → `data: Broadcast` |
| GET/POST/PUT/DELETE | `/api/v1/admin/operations/banners[/:id]` | `operations.banner.manage` | Banner: `{title, imageUrl, linkUrl, position, order, activeFrom, activeTo, status}`; list có `page,pageSize,position,status` |
| GET/POST/PUT/DELETE | `/api/v1/admin/operations/announcements[/:id]` | `operations.announcement.manage` | Announcement: `{content, level, scopeType: "system"\|"subject"\|"group", scopeId?, activeFrom, activeTo}` |
| GET/POST/PUT | `/api/v1/admin/operations/events[/:id]` | `operations.event.manage` | Event: `{type: "webinar"\|"workshop"\|"hackathon", title, schedule, mode, capacity, certificateConfig?, rewardConfig?, status}` |
| POST | `/api/v1/admin/operations/events/:id/transition` (A) | `operations.event.manage` | Body: `{toStatus}` (publish/start/complete/cancel; cancel kèm `{reason}`) |
| GET | `/api/v1/admin/operations/events/:id/registrations` | `operations.event.manage` | Query: `page,pageSize,search,checkedIn?` → `data: {items: Registration[], total}`; `GET .../registrations/export` (A) → CSV |
| GET | `/api/v1/admin/operations/events/:id/checkin-qr` (A) | `operations.event.checkin` | → `data: {qrToken, expiresAt}` (QR rotate) |
| POST | `/api/v1/admin/operations/events/:id/checkin` (A) | `operations.event.checkin` | Body: `{registrationId}` (check-in thủ công) → `data: Registration` |
| PUT | `/api/v1/admin/operations/events/:id/recording` (A) | `operations.event.manage` | Body: `{recordingUrl}` → `data: Event` |
| POST | `/api/v1/admin/operations/events/:id/certificates/issue` (A) | `operations.event.certificate` | Body: `{criteria: "attended"\|"all", rewardPoints?}` → `data: {issuedCount}` |
| GET | `/api/v1/admin/system/flags` | `system.flag.manage` | → `data: Flag[]` (`{key, description, envs: {dev,staging,prod: {enabled, rolloutPercent, targetSegment?}}}`) |
| PUT | `/api/v1/admin/system/flags/:key` | `system.flag.manage` | Body: `{env, enabled, rolloutPercent?, targetSegment?, reason}` → `data: Flag` |
| GET | `/api/v1/admin/system/config` | `system.config.manage` | → `data: ConfigGroup[]` (`{group, entries: [{key, value, type, description}]}`) |
| PUT | `/api/v1/admin/system/config/:key` | `system.config.manage` | Body: `{value, reason}` → `data: ConfigEntry`; BE ghi audit với before/after |
| GET | `/api/v1/admin/system/config/:key/history` (A) | `system.config.manage` | → `data: ConfigChange[]` (before/after, actor, time) |

## 4. State & data

- Query keys: `['ops','notifications', filters]`, `['ops','banners', filters]`,
  `['ops','announcements', filters]`, `['ops','events', filters]`, `['ops','events', id]`,
  `['ops','events', id, 'registrations', filters]`, `['ops','flags']`, `['ops','config']`,
  `['ops','config', key, 'history']`.
- Invalidation: mutation nào invalidate key list + detail tương ứng; check-in invalidate
  registrations với `refetchInterval: 15s` khi tab Check-in đang mở (poll nhẹ thay realtime).
- Preview recipient count: query on-demand (`enabled: false`, gọi `refetch()` khi bấm Preview),
  không cache giữa các lần đổi segment (key chứa serialized segment).
- Zustand: `useBroadcastDraftStore` — draft broadcast (persist localStorage để không mất khi
  refresh); form khác dùng state cục bộ của AntD Form.

## 5. Luồng nghiệp vụ chính

**Flow 1 — Gửi broadcast:**
1. Admin-operations soạn nội dung, chọn channel, build segment (campus=HN + role=student).
2. Bấm Preview → POST preview → hiển thị `recipientCount` + sample 5 user.
3. Bấm Gửi → confirm modal: "Gửi tới **N người nhận** qua kênh X — không thể thu hồi sau khi gửi"
   + yêu cầu gõ lại số người nhận khi N > 1000.
4. Submit → POST notifications → chuyển tab Lịch sử, item status=sending, stats cập nhật khi refetch.
5. Nhánh lỗi: segment rỗng (recipientCount=0) → chặn gửi, hiện cảnh báo; schedule ở quá khứ →
   validation lỗi form.

**Flow 2 — Bật flag trên prod với rollout:**
1. Super Admin mở `/operations/flags`, môi trường chọn prod (banner đỏ cảnh báo).
2. Gạt toggle flag `new-checkout` → modal: chọn rollout 25% + target segment, nhập lý do bắt buộc,
   checkbox "Tôi hiểu thay đổi áp dụng ngay trên production".
3. Submit → PUT flag → toast + hàng flag cập nhật; BE ghi audit; lỗi 403 → toast + refetch permission.

**Flow 3 — Sửa system config:**
1. Super Admin sửa giá trị `payment.retry_limit` 3 → 5, bấm Lưu.
2. Modal diff hiển thị before/after (highlight thay đổi) + lý do bắt buộc.
3. Confirm → PUT config → entry cập nhật, tab history có bản ghi mới. Giá trị sai kiểu →
   validation client-side chặn trước khi mở diff.

**Flow 4 — Event lifecycle + certificate:**
1. Tạo event workshop (wizard) → status draft → Publish (confirm) → user đăng ký.
2. Ngày diễn ra: tab Check-in hiển thị QR rotate; staff quét hoặc check-in thủ công từng registration.
3. Kết thúc: transition Completed → tab Certificates bấm "Cấp cho người đã check-in" → confirm nêu
   số lượng → POST issue → toast `issuedCount`. Nhánh lỗi: event chưa Completed → nút cấp disabled
   kèm tooltip lý do.

## 6. UX states

- Loading: skeleton mirror layout (bảng → skeleton rows; form → skeleton fields; flags →
  skeleton switch rows; config → skeleton tree).
- Empty: chưa có banner/announcement/event → Empty + CTA "Tạo mới" (chỉ khi có quyền);
  lịch sử broadcast rỗng → Empty mô tả.
- Error: query fail → Result 500 + Thử lại; mutation fail → notification.error message envelope.
- Confirm-on-destructive: gửi broadcast (kèm recipient count), hủy scheduled broadcast, xoá
  banner/announcement, cancel event (kèm lý do), đổi flag (kèm lý do, checkbox prod), lưu config
  (diff + lý do), cấp certificate hàng loạt (kèm số lượng).
- Prod safety: mọi màn thao tác flag/config hiển thị môi trường hiện hành rõ ràng; thao tác trên
  prod có visual treatment cảnh báo riêng.
