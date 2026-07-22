## Why

RBAC console gọi REST read KHÔNG tồn tại ở BE (`GET /admin/rbac/roles`, `/rbac/permissions`,
`/rbac/users`, `/rbac/matrix`, `/rbac/users/:id/access`) → 500, toàn bộ trang RBAC hỏng. BE lại
CÓ read qua GraphQL admin gateway (guard `admin.rbac.read`): `rbacRoles`, `rbacPermissions`,
`rbacGrants(userId)`, cùng `adminUsers`/`adminUser`. Chuyển phần READ sang GraphQL để trang chạy
mà không cần BE thêm REST.

## What Changes

- Chuyển các hook READ trong `src/features/rbac/api/index.ts` sang `graphqlRequest`:
  - `useRoles` / `useRole` → `rbacRoles` (lọc + phân trang client; `permissionCount` suy từ
    `permissionCodes.length`).
  - `usePermissionCatalog` → `rbacPermissions` (gom theo `domain`) + `rbacRoles` (suy `roles`
    của mỗi permission).
  - `useRbacUsers` → `adminUsers`; `useUserAccess` → `adminUser` + `rbacGrants`.
  - `useMatrixByUser` → suy ma trận effective từ `rbacGrants ⋈ rbacRoles`.
- Field GraphQL thiếu so với FE type → map tạm (0/false/undefined/[]) + ghi `TODO(BE)`, KHÔNG bịa:
  `isPreset`/`presetDomain`/`userCount`/`updatedAt` (role), `scopable`/`roles` scopable (permission),
  `grantCount` (user), permission-scoped grant + scopeName + reason + grantedBy (user access),
  `useMatrixByPermission` (không có query tra ngược) → rỗng.
- Mutation RBAC (create/update/clone role, assign/revoke role, create/revoke grant) GIỮ REST vì BE
  có command REST. `useScopes` / `useUserAudit` tạm GIỮ REST (chưa có GraphQL tương ứng) — ghi TODO.
- Giữ nguyên signature mọi hook → page không phải sửa.

## Capabilities

### New Capabilities

- `rbac-console`: đọc RBAC catalog/user-access/matrix qua GraphQL thay REST không tồn tại.

## Impact

- **FE sửa**: chỉ `src/features/rbac/api/index.ts`.
- **Không đụng BE**, không đụng folder khác. Các field thiếu ghi `TODO(BE)` để BE bổ sung sau.
- KHÔNG tsc/build/commit trong change này (theo yêu cầu).
