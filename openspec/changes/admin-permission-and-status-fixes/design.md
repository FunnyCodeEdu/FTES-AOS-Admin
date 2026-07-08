## Context

Catalog BE là chuẩn (ADMIN-ARCHITECTURE §2: FE gate theo permission leaf BE trả). ADMIN role có `admin.<domain>.read` mọi domain + nhiều leaf action, nhưng FE gate bằng tên KHÔNG có trong catalog → /403. BE change `admin-role-content-manage-grants` (V161) cấp thêm 17 leaf `admin.*.manage` cho ADMIN.

## BẢNG ÁNH XẠ permission (old FE → new BE leaf) — CHUẨN để apply

### Route/nav VIEW gates (routeRegistry.tsx + NavMenu.tsx)
- `course.view` → `admin.course.read`
- `commerce.view` → `admin.commerce.read`
- `wallet.view` → `wallet.read`
- `pack.view` → `package.manage`
- `quiz.view` → `admin.subject.read`
- `group.view` → `group.manage`
- `community.report.view` / `community.modlog.view` / `community.post.view` / `community.event.review`(route) → `admin.community.read`
- `workflow.review` → `admin.workflow.read`
- `audit.view` → `admin.audit.read`
- `rbac.role.read` / `rbac.permission.read` / `rbac.matrix.read` / `rbac.assignment.manage`(route) / `rbac.role.manage`(route) → `admin.rbac.read`
- `user.impersonate`(route) → `admin.user.read`
- `operations.notification.view` → `notification.manage`
- `operations.banner.manage`(route) → `admin.banner.read`
- `operations.announcement.manage`(route) → `admin.announcement.read`
- `operations.event.manage`(route) → `event.manage`
- `system.flag.manage`(route) → `admin.feature-flag.read`
- `system.config.manage`(route) → `admin.config.read`
- `ctv.invite.view` / `ctv.member.view` / `ctv.performance.view` → `grant.view`
- `analytics.view.learning|subject|community|ai|gamification|business` → `admin.analytics.read`
- GIỮ NGUYÊN (đã đúng): `user.view`, `security.log.view`, `ai.admin.manage`, `subject.view`, `resource.view`, `resource.approve`, `commerce.reconcile`.

### Action gates trong components (Can / hasAnyPermission)
Map về leaf BE API thực thi (leaf ADMIN có sẵn hoặc được V161 cấp):
- `course.update` → `course.manage`
- `pack.manage` → `package.manage`
- `subject.create|update|delete|assign_staff` → `subject.manage`
- `resource.create` → `resource.upload`; `resource.update|delete` → `admin.resource.manage`
- `commerce.order.manage` → `admin.commerce.manage`; `commerce.coupon.manage` → `coupon.manage`; `commerce.refund.execute` → `commerce.refund.approve`
- `community.report.resolve|escalate` → `report.handle`; `community.post.pin|feature|hide|moderate` → `post.moderate`
- `group.assign_ctv|transfer` → `group.manage`; `group.lock` → `group.moderate`
- `operations.notification.send` → `notification.manage`; `operations.banner.manage`(action) → `admin.banner.manage`; `operations.announcement.manage`(action) → `admin.announcement.manage`; `operations.event.manage`(action) → `event.manage`; `operations.event.checkin` → `event.checkin.operate`; `operations.event.certificate` → `event.manage`
- `system.flag.manage`(action) → `admin.feature-flag.manage`; `system.config.manage`(action) → `admin.config.manage`
- `user.reset_password` → `admin.user.reset-password`; `user.session_revoke` → `user.session.revoke`; `user.export` → `user.view`; `user.impersonate`(action) → `admin.user.read`; `user.lock` GIỮ (nhưng BE cần `admin.user.lock` — V161 cấp)
- `rbac.role.manage`(action) → `admin.rbac.manage`; `rbac.assignment.manage`(action) / `rbac.grant.manage` → `admin.rbac.grant` (ADMIN KHÔNG có → nút tự ẩn, đúng: RBAC-manage dành SUPER_ADMIN)
- `quiz.manage` → `course.manage` (tạm — chưa có leaf quiz); `ctv.invite.manage` / `ctv.member.manage` → `grant.view` (tạm); `analytics.export` → `admin.analytics.read` (tạm)
- GIỮ (đã đúng): `course.create`, `course.publish`, `commerce.product.manage`, `commerce.refund.approve`, `wallet.adjust`, `resource.approve`.

## Status-map robustness
Mọi `Record<Status|Role,{text/label,color}>` khi tra `map[value]` → thêm fallback `?? { text/label: String(value), color: "default" }` (KHÔNG destructure trực tiếp `const {text,color}=map[status]`). Nếu key map là lowercase mà BE trả UPPERCASE → normalize (`map[value] ?? map[value?.toLowerCase?.()]`) rồi mới fallback. Áp cho MỌI bảng/badge trong feature owned (courses/subjects/users/resources/packs/commerce/community/moderation/operations/ctv/analytics...).

## Decisions
- **D1** Sửa FE theo catalog BE (không đổi catalog) — route-view mở ngay vì ADMIN đã có admin.*.read.
- **D2** Action gate map về leaf BE API enforce → sau V161 ADMIN chạy được; leaf SUPER_ADMIN (rbac.manage/grant) để nguyên tên đúng → nút ẩn hợp lý.
- **D3** (D)-items map tạm để mở trang; không xoá tính năng; ghi TODO seed leaf BE.

## Risks
- Action `admin.*.manage` chỉ chạy sau khi apitest deploy V161 (trước đó 403) — chấp nhận, route vẫn mở.
- Map tạm (D) có thể để nút trỏ leaf sai ngữ nghĩa → chỉ tạm, ghi TODO.
