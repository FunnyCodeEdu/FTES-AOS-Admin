# admin-community-console — Console cộng đồng & kiểm duyệt

## Why

Admin cũ chỉ có 2 role và không có công cụ kiểm duyệt tập trung: report về post/comment/resource
nằm rải rác, không có workflow duyệt nội dung, không có moderation log. Theo mô hình 4 tầng quyền
trong `docs/ADMIN-ARCHITECTURE.md`, mảng community cần console riêng cho `admin-community`,
đồng thời Moderator và CTV (scoped theo group/subject) phải làm việc được trên cùng hạ tầng
nhưng chỉ thấy đúng queue/scope của mình. Mọi hành động kiểm duyệt phải có lý do + audit.

## What Changes

- Thêm route nhóm `/community/*` (posts, groups, events) và `/moderation/*` (queue, workflow board, log).
- Moderation queue: hàng đợi report cho posts/comments/resources, phân theo mảng + scope;
  Moderator thấy queue mảng được gán, CTV scoped chỉ thấy report thuộc scope của mình;
  hành động approve/reject/remove bắt buộc kèm lý do; escalate lên admin mảng.
- Content workflow board: kanban Draft → AI Review → Mod Review → Approved → Published → Archived,
  kéo thả để transition, mỗi transition guard theo permission.
- Posts management: bảng server-side pagination, search/filter, pin/feature/hide có confirm + audit.
- Groups management: list + detail, đổi owner, khoá group, gán CTV quản group (scoped grant).
- Community events: duyệt/từ chối event do group tạo.
- Moderation log: nhật ký mọi hành động kiểm duyệt, chỉ đọc, filter được.

## Capabilities

### New Capabilities

- `community-moderation-queue`: hàng đợi report posts/comments/resources theo mảng + scope,
  resolve kèm lý do, escalate lên admin, và moderation log chỉ đọc.
- `community-content-workflow`: kanban board trạng thái nội dung với transition kéo thả
  được guard theo permission.
- `community-posts-management`: quản lý posts — search/filter/pin/feature/hide.
- `community-groups-management`: quản lý groups — list/detail, đổi owner, khoá group, gán CTV.
- `community-events-moderation`: duyệt event do group cộng đồng tạo.

### Modified Capabilities

Không sửa capability nào hiện có (repo chưa có main spec cho mảng community).

## Impact

- Route mới: `/community/posts`, `/community/groups`, `/community/groups/:groupId`,
  `/community/events`, `/moderation/queue`, `/moderation/workflow`, `/moderation/log`.
- Feature folder mới: `src/features/community/`, `src/features/moderation/`.
- API BE tiêu thụ: `/api/v1/admin/community/...`, `/api/v1/admin/moderation/...`
  (change `admin-api` bên FTES-AOS-Backend — phần chưa có đánh dấu assumption trong design.md).
- Permission gates: `community.*`, `group.*`, `workflow.review` (+ leaf chi tiết trong design.md);
  CTV bị filter theo scoped grant `{permission, scopeType, scopeId}`.
