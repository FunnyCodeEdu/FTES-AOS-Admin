# Design — admin-ctv-program

## 1. Route & màn hình

**Phía admin mảng** (`src/features/ctv-program/`):

| Route | Màn hình | Thành phần chính |
|---|---|---|
| `/ctv-program/invites` | InviteListPage | Table server-side (email, scope tóm tắt, quyền, hạn grant, trạng thái pending/accepted/expired/revoked, người mời) + filter trạng thái + nút "Mời CTV" |
| `/ctv-program/invites/:inviteId` | InviteDetailPage | Chi tiết lời mời, nút Copy link, Gửi lại email, Thu hồi (confirm + reason) |
| `/ctv-program/members` | MemberListPage | Roster CTV trong mảng mình: user, scopes, số grant còn hiệu lực, grant gần hết hạn nhất, KPI 30 ngày tóm tắt |
| `/ctv-program/members/:memberId` | MemberDetailPage | Tab **Grants** (bảng grant + nút Gia hạn/Mở rộng/Thu hồi), tab **KPI** (chart đóng góp), tab **Lịch sử** (timeline mọi thay đổi: mời, chấp nhận, gia hạn, mở rộng, thu hồi — actor + reason) |
| `/ctv-program/performance` | TeamPerformancePage | Dashboard đội: bảng xếp hạng CTV theo KPI (resource xử lý, post kiểm duyệt), filter khoảng thời gian + scope, drill-down → MemberDetail |

Modal "Mời CTV" (`InviteForm`): email người nhận → chọn scope (1+ scope: GROUP/SUBJECT/
RESOURCE_SET, picker search server-side — tái dùng scope picker của rbac) → chọn tập quyền
(chỉ leaf scopable mà chính admin mảng được phép cấp — BE trả danh sách grantable, assumption)
→ thời hạn grant (bắt buộc) → ghi chú → Preview tóm tắt → Gửi.

**Phía CTV** (`src/features/ctv-workspace/`):

| Route | Màn hình | Thành phần chính |
|---|---|---|
| `/ctv/onboarding/:token` | OnboardingPage | Yêu cầu đăng nhập trước (redirect `/login?returnUrl=`); hiện tóm tắt lời mời (scope, quyền, hạn) → checklist bắt buộc: đọc điều khoản CTV, đọc hướng dẫn theo loại scope, tick cam kết → nút "Chấp nhận & bắt đầu" |
| `/ctv` | WorkspaceHomePage | Danh sách scope card (group/bộ học liệu/subject mình quản, kèm hạn grant) + khối "Việc cần làm" gộp pending items mọi scope + KPI mini |
| `/ctv/groups/:groupId` | CtvGroupPage | Công cụ trong scope group: members, pending posts (duyệt/từ chối nếu có quyền), chỉ render tab/nút theo permission của grant |
| `/ctv/resources` | CtvResourcePage | Học liệu của subject/bộ được gán: list + upload/sửa (KHÔNG có nút approve nếu không có quyền `resource.approve`) |
| `/ctv/kpi` | CtvKpiPage | Dashboard cá nhân: số resource xử lý, post kiểm duyệt, đóng góp theo tuần/tháng, so mục tiêu (nếu BE có) |

## 2. Permission gates

**Admin mảng** (tên leaf **assumption** theo catalog BE):

| Permission | Gate |
|---|---|
| `ctv.invite.manage` | Nav "Chương trình CTV → Lời mời", nút Mời/Thu hồi/Gửi lại; thiếu → 403 |
| `ctv.member.read` | Route members + performance (đọc) |
| `ctv.member.manage` | Nút Gia hạn/Mở rộng/Thu hồi trên MemberDetail |
| `ctv.performance.read` | Route `/ctv-program/performance` |

- **Scope theo mảng**: admin mảng chỉ thấy/mời CTV cho scope thuộc mảng mình — BE enforce qua
  data trả về (invite/member list đã lọc theo domain của admin, **assumption**); FE không tự lọc
  theo role string.
- Admin chỉ được cấp quyền nằm trong danh sách `grantablePermissions` BE trả (không thể cấp
  quyền mình không có quyền cấp).

**CTV**:
- Nhóm nav `/ctv/*` chỉ hiện khi user có ≥1 scoped grant còn hiệu lực (`expiresAt` tương lai).
- Từng route scope: `hasScopedPermission(perm, scopeType, scopeId)`; vào `/ctv/groups/:id`
  với group ngoài scope → `/403` nêu rõ "ngoài scope được gán".
- Nút hành động trong workspace gate theo đúng permission của grant (vd ctv-resource không có
  `resource.approve` → không render nút duyệt).
- Search/list trong workspace luôn đóng khung scope: FE truyền `scopeId` vào mọi query, BE
  enforce lần nữa; kết quả ngoài scope không bao giờ render.

## 3. API contract tiêu thụ

Base `/api/v1/admin/ctv`, envelope chuẩn. Toàn bộ là **assumption** — BE (`admin-api`) chưa
chốt spec CTV, cần đối chiếu khi có:

| Method | Path | Quyền | Request → Response `data` |
|---|---|---|---|
| POST | `/invites` | `ctv.invite.manage` | `{email, scopes: [{scopeType, scopeId}], permissions: string[], grantExpiresAt, note}` → `{inviteId, inviteUrl, emailSent, expiresAt}` |
| GET | `/invites?status=&page=` | `ctv.invite.manage` | → `{items: [{inviteId, email, scopes, permissions, status, invitedBy, createdAt, expiresAt}], total}` (đã lọc theo mảng của admin) |
| GET | `/invites/:inviteId` | `ctv.invite.manage` | → chi tiết + `inviteUrl` |
| POST | `/invites/:inviteId/revoke` · `/invites/:inviteId/resend` | `ctv.invite.manage` | revoke: `{reason}` → `null` |
| GET | `/invites/token/:token` | bearer (user nhận) | → `{invite: {scopes, permissions, grantExpiresAt, invitedBy, note}, checklist: [{key, title, contentUrl, required}]}` — 410 nếu hết hạn/thu hồi |
| POST | `/invites/token/:token/accept` | bearer | `{acknowledgedItems: string[]}` → `{grants: [...]}`; FE refetch `['auth','me']` |
| GET | `/me/scopes` | CTV (grant) | → `{scopes: [{scopeType, scopeId, scopeName, permissions: string[], expiresAt}]}` |
| GET | `/me/todo` | CTV | → `{items: [{type: 'PENDING_POST'\|'PENDING_RESOURCE', scopeId, scopeName, count, link}]}` |
| GET | `/me/kpi?range=` | CTV | → `{resourcesProcessed, postsModerated, contributions: [{date, count}], byScope: [...]}` |
| GET | `/members?page=&search=` | `ctv.member.read` | → `{items: [{memberId, user, scopes, activeGrantCount, nearestExpiry, kpi30d}], total}` |
| GET | `/members/:memberId` | `ctv.member.read` | → `{user, grants: [...], kpi, history: [...]}` |
| POST | `/members/:memberId/grants/extend` | `ctv.member.manage` | `{grantIds: string[], newExpiresAt, reason}` → grants + `auditId` |
| POST | `/members/:memberId/grants/expand` | `ctv.member.manage` | `{scopes, permissions, expiresAt, reason}` → grants mới + `auditId` |
| POST | `/members/:memberId/grants/revoke` | `ctv.member.manage` | `{grantIds: string[], reason}` → `auditId` |
| GET | `/members/:memberId/history?page=` | `ctv.member.read` | → timeline `{action, actor, detail, reason, at}` |
| GET | `/performance?range=&scopeId=` | `ctv.performance.read` | → `{members: [{memberId, user, resourcesProcessed, postsModerated, score}]}` |
| GET | `/grantable-permissions` | `ctv.invite.manage` | → `{permissions: [{key, description, scopeTypes: string[]}]}` — leaf admin này được phép cấp |

Dữ liệu trong workspace (pending posts, resources của scope) tiêu thụ endpoint console tương ứng
(`/community/*`, `/academic/*`) kèm tham số scope — hợp đồng chi tiết thuộc change console đó;
ở đây chỉ ràng buộc: **mọi call từ workspace phải kèm scopeId thuộc grant** (assumption BE trả
403 `OUT_OF_SCOPE` nếu vi phạm).

## 4. State & data

TanStack Query keys:
- Admin: `['ctv','invites',{status,page}]`, `['ctv','invite',inviteId]`,
  `['ctv','members',{search,page}]`, `['ctv','member',memberId]`,
  `['ctv','member',memberId,'history',page]`, `['ctv','performance',{range,scopeId}]`,
  `['ctv','grantable-permissions']` (staleTime 10 phút).
- CTV: `['ctv','me','scopes']` (staleTime 5 phút, refetch on focus), `['ctv','me','todo']`
  (refetchInterval 60s), `['ctv','me','kpi',range]`, `['ctv','onboarding',token]`.

Invalidation:
- Tạo/thu hồi/gửi lại invite → `['ctv','invites']` (+ `['ctv','invite',id]`).
- Accept onboarding → `['auth','me']` (nhận grants mới) + `['ctv','me','scopes']`.
- Extend/expand/revoke → `['ctv','member',id]`, `['ctv','members']`,
  `['ctv','member',id,'history']`; nếu target đang online là chính mình (không xảy ra với CTV
  flow admin) bỏ qua; BE đẩy notification cho CTV → workspace tự refetch me/scopes.
- Grant hết hạn khi đang mở workspace: query scopes trả về thiếu scope → UI gỡ card + nav entry.

Không cần Zustand mới; scope đang chọn trong workspace giữ ở URL param (deep-link được).

## 5. Luồng nghiệp vụ chính

**Flow 1 — Mời CTV:**
1. Admin mảng bấm "Mời CTV" → `InviteForm`: email → scopes (picker) → permissions (chỉ từ
   `grantable-permissions`, lọc theo scopeType đã chọn) → hạn grant → note.
2. Preview tóm tắt: "Mời <email> làm CTV: <n> scope, <m> quyền, đến <ngày>".
3. POST → nhận `inviteUrl` → màn hình success: copy link + trạng thái email đã gửi.
4. Email trùng lời mời pending → BE code lỗi → hiện "Đã có lời mời đang chờ" + link tới invite cũ.

**Flow 2 — Onboarding CTV:**
1. Người nhận mở link → chưa login → `/login?returnUrl=/ctv/onboarding/:token` (đăng ký nếu
   chưa có tài khoản — ngoài scope change này, tài khoản là user hệ thống có sẵn).
2. `GET /invites/token/:token`: hợp lệ → hiện tóm tắt scope/quyền/hạn + checklist; hết hạn/
   thu hồi → màn hình 410 "Lời mời không còn hiệu lực, liên hệ người mời".
3. Tick đủ mục required → nút Accept bật → POST accept → refetch `['auth','me']` →
   redirect `/ctv` (nav workspace xuất hiện).
4. Token thuộc email khác với user đang đăng nhập → BE từ chối → thông báo rõ + nút logout để
   đăng nhập đúng tài khoản.

**Flow 3 — CTV làm việc trong scope:**
1. `/ctv`: scope cards + todo gộp. Click todo → route scope tương ứng.
2. Trong `/ctv/groups/:groupId`: chỉ tab/nút theo permission grant; duyệt post → mutation kèm
   scopeId → invalidate todo.
3. CTV sửa URL sang group khác (ngoài grant) → guard `hasScopedPermission` fail → `/403`
   "Ngoài scope được gán" (không lộ tên group đó).
4. Search trong workspace luôn gắn scope hiện tại; kết quả ngoài scope không bao giờ xuất hiện
   (BE lọc, FE truyền scopeId bắt buộc).

**Flow 4 — Gia hạn / mở rộng / thu hồi:**
1. MemberDetail tab Grants: chọn 1+ grant → Gia hạn (chọn hạn mới + reason) / Mở rộng (form
   thêm scope/quyền như InviteForm, không cần email) / Thu hồi (reason bắt buộc).
2. Confirm nêu hệ quả: thu hồi → "CTV mất ngay quyền X trên scope Y, việc đang dở trong scope
   sẽ không truy cập được"; gia hạn → hạn cũ → hạn mới.
3. Thành công → toast + audit ref, timeline Lịch sử thêm entry, BE gửi notification cho CTV.
4. Lỗi (grant đã bị thu hồi trước đó bởi người khác) → refetch member, hiện trạng thái mới nhất.

## 6. UX states

- **Loading**: skeleton mirror — invite table, scope cards (đúng số card ước lượng), KPI chart
  placeholder, timeline skeleton.
- **Empty**: chưa có invite ("Mời CTV đầu tiên" + nút), CTV chưa có việc ("Không có việc cần
  làm 🎉"), KPI chưa có dữ liệu, member list trống.
- **Error**: token invite lỗi/410 → màn hình riêng có hướng dẫn; lỗi list → retry; mutation lỗi
  → message giữ trong modal.
- **Confirm-on-destructive**: thu hồi invite, thu hồi/gia hạn/mở rộng grant — confirm nêu hệ quả
  + reason bắt buộc; accept onboarding là cam kết — hiện lại tóm tắt trước khi xác nhận.
- Grant sắp hết hạn: banner vàng trong workspace CTV ("Quyền trên scope X hết hạn sau N ngày,
  liên hệ admin để gia hạn") + tag trên member list phía admin.
