# Tasks — admin-rbac-management

## 1. Khung feature & API layer
- [ ] 1.1 Tạo `src/features/rbac/` (pages/api/components); đăng ký route `/system/rbac/*` vào `routeRegistry` kèm `requiredPermissions` (`rbac.*`)
- [ ] 1.2 `src/features/rbac/api/`: hooks roles/permissions/users/access/grants/matrix/scopes theo bảng query keys trong design.md
- [ ] 1.3 Types: `Role`, `PermissionLeaf`, `UserAccess`, `ScopedGrant`, `MatrixEntry` (đánh dấu field assumption chờ BE)

## 2. Role management
- [ ] 2.1 RoleListPage: table server-side + search + Clone (modal đặt tên)
- [ ] 2.2 `PermissionTree` component: Tree checkable nhóm domain, search, đếm selected — tái dùng cho editor + matrix
- [ ] 2.3 RoleEditorPage (new/:roleId): form + tree + banner "X user ảnh hưởng" + guard unsaved changes
- [ ] 2.4 `RoleDiff` modal confirm: cột thêm/bỏ permission + số user ảnh hưởng → mutation + invalidate + toast audit ref

## 3. Permission catalog
- [ ] 3.1 PermissionCatalogPage: collapse theo domain, search key/mô tả, cột "role đang chứa" link sang role editor

## 4. User access & gán role
- [ ] 4.1 UserAccessSearchPage: search user server-side, bảng roles/grants count
- [ ] 4.2 UserAccessDetailPage khối Roles: gán role (modal 2 tab: role thường / preset admin mảng), tước role — đều confirm nêu hệ quả + reason khi tước
- [ ] 4.3 Preset admin mảng: load `/roles?isPreset=true`, confirm liệt kê permission nguy hiểm, disable khi đã có
- [ ] 4.4 Khối lịch sử thay đổi quyền (`['rbac','user-audit',userId]`)

## 5. Scoped grants
- [ ] 5.1 `ScopedGrantForm`: permission scopable → scopeType → scope picker (search server, debounce) → expiresAt + reason bắt buộc
- [ ] 5.2 Bảng grants: tag sắp hết hạn/hết hạn; thu hồi có confirm + reason
- [ ] 5.3 Invalidation đầy đủ (user-access, users, matrix, user-audit, auth/me nếu tự đổi mình)

## 6. Access matrix
- [ ] 6.1 AccessMatrixPage chế độ theo user: cây permission hiệu lực + nguồn (role/grant + hạn)
- [ ] 6.2 Chế độ theo permission: danh sách user có leaf + nguồn + scope; search 2 chiều
- [ ] 6.3 Empty/error states cho cả 2 chế độ

## 7. Verify
- [ ] 7.1 npm run build xanh + tsc --noEmit sạch
- [ ] 7.2 Smoke test: user thiếu `rbac.*` không thấy nav, vào URL ra 403 đúng permission; sửa role hiện diff; cấp grant thiếu reason bị chặn
