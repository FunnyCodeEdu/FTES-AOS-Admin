# Tasks — admin-rbac-management

## 1. Khung feature & API layer
- [x] 1.1 Tạo `src/features/rbac/` (pages/api/components); đăng ký route `/system/rbac/*` vào `routeRegistry` kèm `requiredPermissions` (`rbac.*`)
- [x] 1.2 `src/features/rbac/api/`: hooks roles/permissions/users/access/grants/matrix/scopes theo bảng query keys trong design.md
- [x] 1.3 Types: `Role`, `PermissionLeaf`, `UserAccess`, `ScopedGrant`, `MatrixEntry` (đánh dấu field assumption chờ BE)

## 2. Role management
- [x] 2.1 RoleListPage: table server-side + search + Clone (modal đặt tên)
- [x] 2.2 `PermissionTree` component: Tree checkable nhóm domain, search, đếm selected — tái dùng cho editor + matrix
- [x] 2.3 RoleEditorPage (new/:roleId): form + tree + banner "X user ảnh hưởng" + guard unsaved changes
- [x] 2.4 `RoleDiff` modal confirm: cột thêm/bỏ permission + số user ảnh hưởng → mutation + invalidate + toast audit ref

## 3. Permission catalog
- [x] 3.1 PermissionCatalogPage: collapse theo domain, search key/mô tả, cột "role đang chứa" link sang role editor

## 4. User access & gán role
- [x] 4.1 UserAccessSearchPage: search user server-side, bảng roles/grants count
- [x] 4.2 UserAccessDetailPage khối Roles: gán role (modal 2 tab: role thường / preset admin mảng), tước role — đều confirm nêu hệ quả + reason khi tước
- [x] 4.3 Preset admin mảng: load `/roles?isPreset=true`, confirm liệt kê permission nguy hiểm, disable khi đã có
- [x] 4.4 Khối lịch sử thay đổi quyền (`['rbac','user-audit',userId]`)

## 5. Scoped grants
- [x] 5.1 `ScopedGrantForm`: permission scopable → scopeType → scope picker (search server, debounce) → expiresAt + reason bắt buộc
- [x] 5.2 Bảng grants: tag sắp hết hạn/hết hạn; thu hồi có confirm + reason
- [x] 5.3 Invalidation đầy đủ (user-access, users, matrix, user-audit, auth/me nếu tự đổi mình)

## 6. Access matrix
- [x] 6.1 AccessMatrixPage chế độ theo user: cây permission hiệu lực + nguồn (role/grant + hạn)
- [x] 6.2 Chế độ theo permission: danh sách user có leaf + nguồn + scope; search 2 chiều
- [x] 6.3 Empty/error states cho cả 2 chế độ

## 7. Verify
- [x] 7.1 npm run build xanh + tsc --noEmit sạch
- [x] 7.2 Smoke test: user thiếu `rbac.*` không thấy nav RBAC, vào URL ra 403 đúng permission; user có `rbac.role.read` thấy nav group Hệ thống. Kiểm tra static: không có so sánh role string.
- [x] 7.3 Smoke test gán preset: `AssignRoleModal` hiển thị 2 bước, liệt kê 3 quyền, cảnh báo quyền nguy hiểm `user.lock`, và gọi POST `/rbac/users/abc/roles` với `{ roleId: "preset-academic" }` (`scripts/smoke/rbac-assign.mjs`).
