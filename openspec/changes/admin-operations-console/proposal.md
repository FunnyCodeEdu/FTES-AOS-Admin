# admin-operations-console — Console vận hành

## Why

Mảng vận hành (notification, banner, announcement, event chính thức, feature flag, system config)
hiện chưa có công cụ nào trong admin mới. Theo `docs/ADMIN-ARCHITECTURE.md`, `admin-operations`
là một mảng admin riêng với console `/operations/*`; feature toggle và system configuration là
hành động rủi ro cao (ảnh hưởng toàn hệ thống) nên phải giới hạn Super Admin / admin-operations,
có confirm nêu hệ quả, diff thay đổi và audit log. Broadcast sai target có thể spam hàng nghìn
user — cần preview + confirm số lượng người nhận trước khi gửi.

## What Changes

- Thêm route nhóm `/operations/*` với feature folder `src/features/operations/`.
- Notification broadcast: soạn thông báo, target theo segment (campus/subject/role), schedule,
  preview + đếm người nhận, lịch sử gửi + stats (sent/delivered/read).
- Banner management: CRUD banner, vị trí hiển thị, schedule hiệu lực, preview, sắp thứ tự.
- Announcement: thông báo hệ thống + per subject/group, có schedule và trạng thái.
- Event vận hành: tạo webinar/workshop/hackathon chính thức; quản registration, check-in QR,
  attendance, recording; cấp certificate + rewards cho người tham dự.
- Feature toggle: bật/tắt flag theo môi trường, rollout % / target segment — chỉ Super Admin và
  admin-operations, mọi thay đổi có confirm + audit.
- System configuration viewer/editor: chỉ Super Admin, mọi thay đổi hiển thị diff trước khi lưu
  + ghi audit.

## Capabilities

### New Capabilities

- `operations-notification-broadcast`: soạn/target/schedule/preview broadcast + lịch sử và stats.
- `operations-banner-announcement`: CRUD banner theo vị trí + schedule, và announcement hệ thống
  / per subject/group.
- `operations-official-events`: event vận hành chính thức — lifecycle, registration, check-in QR,
  attendance, recording, certificate + rewards.
- `operations-feature-toggle`: quản lý feature flag theo môi trường với rollout %/target,
  confirm + audit.
- `operations-system-configuration`: viewer/editor cấu hình hệ thống cho Super Admin với diff
  + audit.

### Modified Capabilities

Không sửa capability nào hiện có.

## Impact

- Route mới: `/operations/notifications`, `/operations/banners`, `/operations/announcements`,
  `/operations/events`, `/operations/events/:eventId`, `/operations/flags`, `/operations/config`.
- Feature folder mới: `src/features/operations/`.
- API BE tiêu thụ: `/api/v1/admin/operations/...`, `/api/v1/admin/system/flags`,
  `/api/v1/admin/system/config` (đánh dấu assumption trong design.md nếu BE chưa spec).
- Permission gates: `operations.*` (notification/banner/announcement/event),
  `system.flag.manage`, `system.config.manage` — hai leaf cuối chỉ nằm trong preset Super Admin
  (flag thêm admin-operations). Moderator/CTV hoàn toàn ngoài scope console này.
