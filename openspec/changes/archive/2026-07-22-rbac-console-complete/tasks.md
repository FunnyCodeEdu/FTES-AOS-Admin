## 1. Tiêu thụ field/query mới (`src/features/rbac/api/index.ts`)

- [x] 1.1 `RBAC_ROLES_QUERY` +`isPreset`/`userCount`; `mapRole` đọc thật; `presetDomain` = role code.
- [x] 1.2 `RBAC_PERMISSIONS_QUERY` +`scopable`; `usePermissionCatalog` map `scopable` thật.
- [x] 1.3 `useUserAccess` thêm `rbacPermissionGrants` → map tab "scoped grants" (`UserScopedGrant`).
- [x] 1.4 `useMatrixByPermission` dùng `rbacMatrixByPermission` (bỏ stub rỗng).
- [x] 1.5 `useUserAudit` dùng `rbacUserAudit` GraphQL (page 1-based → 0-based); bỏ REST.
- [x] 1.6 Giữ signature hook; `useScopes` GIỮ REST (chưa có scope-catalog GraphQL) — ghi chú.

## 2. Verify (ngoài phạm vi change này)

- [x] 2.1 tsc/build — verified `npx tsc -b --noEmit` sạch (EXIT 0); rbacPermissionGrants/rbacMatrixByPermission/rbacUserAudit + isPreset/userCount/scopable đã tiêu thụ thật.
