# Design — admin-rbac-management

## 1. Route & màn hình

| Route | Màn hình | Thành phần chính |
|---|---|---|
| `/system/rbac/roles` | RoleListPage | Table server-side (name, mô tả, số permission, số user, isPreset, updatedAt) + search + nút Tạo role / Clone (menu dòng) |
| `/system/rbac/roles/new` · `/system/rbac/roles/:roleId` | RoleEditorPage | Form name/description + `PermissionTree` (Tree checkable nhóm theo domain, search trong cây, đếm đã chọn); footer sticky Lưu/Huỷ; khi sửa role đang có user → banner cảnh báo số user ảnh hưởng |
| `/system/rbac/permissions` | PermissionCatalogPage | Danh sách leaf nhóm collapse theo domain (users/academic/commerce/community/operations/system), mỗi leaf: key, mô tả, các role đang chứa; search theo key/mô tả |
| `/system/rbac/users` | UserAccessSearchPage | Search user (email/tên) server-side → bảng kết quả (user, roles hiện có, số grant) → click vào detail |
| `/system/rbac/users/:userId` | UserAccessDetailPage | 3 khối: (a) Roles — tag list + nút Gán role (modal chọn role, có tab "Preset admin mảng") + tước role; (b) Scoped grants — bảng grant (permission, scopeType, scope name, expiresAt, reason, người cấp) + nút Cấp grant (`ScopedGrantForm`) + Thu hồi; (c) Lịch sử thay đổi quyền của user (đọc từ audit) |
| `/system/rbac/matrix` | AccessMatrixPage | 2 chế độ: theo **user** (chọn user → cây permission hiệu lực, đánh dấu nguồn: role nào/grant nào) và theo **permission** (chọn leaf → danh sách user có nó, kèm nguồn + scope) |

`ScopedGrantForm` (modal): chọn permission (chỉ leaf cho phép scope), `scopeType`
(GROUP/SUBJECT/RESOURCE_SET) → picker scope tương ứng (search server-side), `expiresAt`
(bắt buộc, DatePicker, tối đa theo config BE — assumption 1 năm), `reason` (bắt buộc, textarea).

## 2. Permission gates

Tên permission leaf là **assumption** theo catalog BE (`identity-rbac`), FE chỉ dùng làm gate:

| Permission | Gate |
|---|---|
| `rbac.role.read` | Nav group "Hệ thống → RBAC", route roles + permissions (đọc) |
| `rbac.role.manage` | Nút Tạo/Sửa/Clone role; thiếu → nút ẩn, route editor → 403 |
| `rbac.permission.read` | Route catalog |
| `rbac.assignment.manage` | Nút gán/tước role, preset admin mảng; thiếu → khối Roles read-only |
| `rbac.grant.manage` | Nút cấp/thu hồi scoped grant; thiếu → khối Grants read-only |
| `rbac.matrix.read` | Route matrix |

- Thiếu toàn bộ `rbac.*` → nav không hiện mục RBAC; vào thẳng URL → `/403` nêu permission thiếu
  (cơ chế từ `admin-foundation`).
- CTV/Moderator không bao giờ có `rbac.*` → mọi URL `/system/rbac/*` ra 403.
- Đây là gate permission thuần — KHÔNG check "là Super Admin" bằng role string.

## 3. API contract tiêu thụ

Base `/api/v1/admin/rbac`, envelope chuẩn. Toàn bộ path dưới đây là **assumption** khớp change
`identity-rbac`/`admin-api` bên BE — cần đối chiếu khi BE chốt:

| Method | Path | Quyền | Request → Response `data` |
|---|---|---|---|
| GET | `/roles?search=&page=&size=` | `rbac.role.read` | → `{items: [{id, name, description, isPreset, presetDomain?, permissionCount, userCount, updatedAt}], total}` |
| GET | `/roles/:id` | `rbac.role.read` | → `{id, name, description, isPreset, permissions: string[], userCount}` |
| POST | `/roles` · PUT `/roles/:id` | `rbac.role.manage` | `{name, description, permissions: string[]}` → role; PUT trả thêm `affectedUserCount` **(assumption)** |
| POST | `/roles/:id/clone` | `rbac.role.manage` | `{name}` → role mới |
| GET | `/permissions` | `rbac.permission.read` | → `{domains: [{domain, permissions: [{key, description, scopable: boolean, roles: string[]}]}]}` |
| GET | `/users?search=&page=` | `rbac.assignment.manage` hoặc `rbac.matrix.read` | → `{items: [{userId, email, fullName, roles: string[], grantCount}], total}` |
| GET | `/users/:userId/access` | như trên | → `{user, roles: [{roleId, name, assignedAt, assignedBy}], grants: [{grantId, permission, scopeType, scopeId, scopeName, expiresAt, reason, grantedBy, grantedAt}]}` |
| POST | `/users/:userId/roles` · DELETE `/users/:userId/roles/:roleId` | `rbac.assignment.manage` | POST `{roleId}`; response → access mới + `auditId` **(assumption: BE trả auditId mọi mutation quyền)** |
| POST | `/users/:userId/grants` | `rbac.grant.manage` | `{permission, scopeType: 'GROUP'\|'SUBJECT'\|'RESOURCE_SET', scopeId, expiresAt, reason}` → grant + `auditId` |
| DELETE | `/grants/:grantId` | `rbac.grant.manage` | `{reason}` → `auditId` |
| GET | `/matrix?userId=` · `/matrix?permission=` | `rbac.matrix.read` | theo user → `{effective: [{permission, sources: [{type: 'ROLE'\|'GRANT', name, scope?}]}]}`; theo permission → `{users: [{userId, email, source, scope?}]}` |
| GET | `/scopes?type=&search=` | `rbac.grant.manage` | → `{items: [{scopeId, name, type}]}` — picker scope **(assumption: BE cung cấp endpoint tra scope hợp lệ)** |
| GET | `/users/:userId/audit?page=` | `rbac.assignment.manage` | → lịch sử thay đổi quyền **(assumption — có thể gộp vào audit chung của `admin-analytics-audit`)** |

403 từ các endpoint này hiển thị theo cơ chế `ForbiddenError` của `admin-api-client`.

## 4. State & data

TanStack Query keys (feature `src/features/rbac/api/`):
- `['rbac','roles', {search, page, size}]` — list; `['rbac','role', roleId]` — detail.
- `['rbac','permissions']` — catalog, staleTime 10 phút (ít đổi).
- `['rbac','users', {search, page}]`; `['rbac','user-access', userId]`.
- `['rbac','matrix','user', userId]` · `['rbac','matrix','permission', permKey]`.
- `['rbac','scopes', scopeType, search]` — picker, debounce 300ms.
- `['rbac','user-audit', userId, page]`.

Invalidation:
- Mutation role (create/update/clone) → invalidate `['rbac','roles']`, `['rbac','role',id]`,
  `['rbac','permissions']` (cột roles), và `['rbac','matrix']` (prefix).
- Gán/tước role, cấp/thu hồi grant → invalidate `['rbac','user-access',userId]`,
  `['rbac','users']`, `['rbac','matrix']` (prefix), `['rbac','user-audit',userId]`;
  nếu user bị đổi là chính mình → invalidate `['auth','me']`.

Không cần Zustand store riêng — state form cục bộ; draft role editor giữ trong state trang
(cảnh báo `beforeunload` khi có thay đổi chưa lưu).

## 5. Luồng nghiệp vụ chính

**Flow 1 — Sửa role đang có user dùng:**
1. Mở RoleEditor, đổi tập permission → nút Lưu bật.
2. Bấm Lưu → `RoleDiff` modal: 2 cột **Thêm (+n)** / **Bỏ (−m)** permission, dòng cảnh báo
   "Ảnh hưởng ngay tới X user đang giữ role này".
3. Confirm → PUT; thành công → toast kèm link audit (`auditId`); lỗi → giữ modal, hiện message BE.
4. Huỷ → về editor, không mất draft.

**Flow 2 — Bổ nhiệm admin mảng:**
1. UserAccessDetail → Gán role → tab "Preset admin mảng" liệt kê 5 preset
   (admin-users/admin-academic/admin-commerce/admin-community/admin-operations, lấy từ
   `/roles?isPreset=true` — assumption flag `isPreset`).
2. Chọn preset → confirm nêu hệ quả: "User sẽ có N permission của mảng <domain>, gồm các
   quyền nguy hiểm: <danh sách leaf nguy hiểm nếu có>".
3. Confirm → POST roles; invalidate access + matrix; toast + audit ref.
4. User đã có preset đó → nút disable kèm tooltip "Đã có role này".

**Flow 3 — Cấp scoped grant cho CTV:**
1. Cấp grant → `ScopedGrantForm`: chọn permission scopable → chọn scopeType → search scope
   (picker server-side) → expiresAt (bắt buộc) + reason (bắt buộc).
2. Submit → confirm hiển thị đúng câu: "Cấp `<permission>` trên <scopeType> «<scopeName>»
   đến <ngày>, lý do: <reason>".
3. POST thành công → bảng grants thêm dòng, toast + audit ref. BE từ chối (scope không hợp lệ,
   quá thời hạn tối đa) → lỗi hiện trong modal, giữ dữ liệu đã nhập.
4. Thu hồi grant → confirm nêu hệ quả ("CTV mất ngay quyền X trên scope Y") + bắt buộc reason
   → DELETE → invalidate.

**Flow 4 — Tra cứu "ai có quyền gì":**
1. Matrix theo permission: chọn `resource.approve` → bảng user (nguồn ROLE/GRANT, scope nếu có).
2. Matrix theo user: chọn user → cây permission hiệu lực; hover mỗi leaf hiện nguồn
   (role nào / grant nào + hạn).
3. Kết quả rỗng → empty state "Chưa ai có quyền này".

## 6. UX states

- **Loading**: table skeleton đúng số cột; PermissionTree skeleton dạng cây; matrix skeleton 2 panel.
- **Empty**: chưa có role tuỳ chỉnh (chỉ preset) → hướng dẫn tạo; user không grant → khối trống
  kèm nút Cấp grant; search không kết quả → Empty + gợi ý đổi từ khoá.
- **Error**: lỗi tải → `Result` + retry; lỗi mutation → message trong modal đang mở, không đóng modal.
- **Confirm-on-destructive**: MỌI mutation quyền (lưu role, gán/tước role, cấp/thu hồi grant)
  đều có confirm nêu hệ quả + diff trước/sau; thu hồi/tước bắt buộc nhập lý do; sau thành công
  hiển thị tham chiếu audit.
- Grant sắp hết hạn (<7 ngày) → tag vàng "sắp hết hạn"; đã hết hạn → tag xám, dòng mờ.
