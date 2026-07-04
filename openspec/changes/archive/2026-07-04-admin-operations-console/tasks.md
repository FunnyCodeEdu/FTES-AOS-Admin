# Tasks — admin-operations-console

## 1. Khung feature & API layer

- [x] 1.1 Tạo feature folder `src/features/operations/` (pages + api + components).
- [x] 1.2 Viết API modules: `notifications.api.ts`, `banners.api.ts`, `announcements.api.ts`,
      `events.api.ts`, `flags.api.ts`, `config.api.ts` (typed, envelope).
- [x] 1.3 Query hooks + keys theo design.md (list server-side pagination, detail, history,
      registrations với poll 15s khi tab Check-in mở).
- [x] 1.4 Đăng ký route `/operations/*` với guard theo permission leaf
      (`operations.notification.view`, `operations.banner.manage`, `operations.announcement.manage`,
      `operations.event.manage`, `system.flag.manage`, `system.config.manage`) + nav gated.

## 2. Notification broadcast

- [x] 2.1 `NotificationsPage` — 2 tab Soạn / Lịch sử.
- [x] 2.2 Form soạn: title, rich-text content, channels, `SegmentBuilder` (campus/subject/role),
      schedule; `useBroadcastDraftStore` persist draft.
- [x] 2.3 Preview: POST preview on-demand, hiển thị recipientCount + sample; chặn gửi khi count=0.
- [x] 2.4 Confirm gửi (nêu số người nhận, gõ lại số khi >1000) → mutation create; hủy scheduled
      có confirm.
- [x] 2.5 Tab Lịch sử: bảng server-side pagination + stats sent/delivered/read + detail drawer.

## 3. Banner & Announcement

- [x] 3.1 `BannersPage` — bảng + filter vị trí/trạng thái; modal CRUD (upload ảnh, vị trí,
      schedule, thứ tự); preview panel theo vị trí; xoá có confirm.
- [x] 3.2 `AnnouncementsPage` — bảng + filter phạm vi; modal CRUD (scope system/subject/group +
      picker scopeId, mức độ, schedule); xoá có confirm.

## 4. Official events

- [x] 4.1 `EventsPage` — bảng + filter loại/trạng thái + search; wizard tạo event.
- [x] 4.2 `EventDetailPage` — tabs Overview/Registrations/Check-in/Recording/Certificates.
- [x] 4.3 Lifecycle transitions (publish/start/complete/cancel — cancel kèm lý do + confirm).
- [x] 4.4 Registrations: bảng search + export CSV.
- [x] 4.5 Check-in: hiển thị QR rotate + check-in thủ công (gate `operations.event.checkin`),
      bảng attendance poll.
- [x] 4.6 Recording URL editor; Certificates & Rewards: cấp hàng loạt theo criteria, confirm nêu
      số lượng, disabled khi event chưa Completed (gate `operations.event.certificate`).

## 5. Feature toggles & System config

- [x] 5.1 `FlagsPage` — bảng flag per môi trường, toggle + modal rollout %/target + lý do bắt buộc
      + checkbox xác nhận khi env=prod; visual cảnh báo prod.
- [x] 5.2 `ConfigPage` — cây config theo group, editor typed theo kiểu giá trị, modal diff
      before/after + lý do, tab history per key. Route chỉ Super Admin (`system.config.manage`).

## 6. Verify

- [x] 6.1 `npm run build` xanh + `tsc --noEmit` sạch.
- [x] 6.2 Smoke test 4 flow trong design.md (broadcast, flag prod, config diff, event lifecycle)
      với account Super Admin, admin-operations, và 1 account không có quyền (expect 403/ẩn nav).
