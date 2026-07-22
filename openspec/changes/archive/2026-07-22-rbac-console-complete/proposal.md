## Why

Change trước (`rbac-console-use-graphql-read`) chuyển RBAC console sang GraphQL nhưng schema BE còn
thiếu field nên FE map tạm (đánh dấu `TODO(BE)`): `isPreset`/`userCount` của role, `scopable` của
permission, tab "scoped grants" và "ma trận theo permission" để trống, và `useUserAudit` còn REST
(500). BE nay đã bổ sung field + query (`rbac-graphql-read-complete`); FE tiêu thụ để hoàn thiện.

## What Changes

- `mapRole` đọc thật `isPreset`/`userCount` từ `rbacRoles`; `presetDomain` dùng role code làm nhãn
  (identity không có field domain cho role); `updatedAt` giữ "" (BE chưa expose qua read).
- `usePermissionCatalog` đọc `scopable` thật từ `rbacPermissions` → `ScopedGrantModal` lọc được
  permission scopable.
- `useUserAccess` đọc tab "scoped grants" từ query mới `rbacPermissionGrants` (map `UserScopedGrant`);
  `scopeName` = scopeId (chưa có scope catalog), `reason` = "" (model grant không lưu).
- `useMatrixByPermission` đọc query mới `rbacMatrixByPermission` (bỏ stub rỗng).
- `useUserAudit` chuyển sang `rbacUserAudit` GraphQL (bỏ REST 500).
- Giữ nguyên signature mọi hook → page không phải sửa.

## Capabilities

### Modified Capabilities

- `rbac-console`: tiêu thụ field/query GraphQL mới thay các map tạm `TODO(BE)`.

## Impact

- **FE sửa**: chỉ `src/features/rbac/api/index.ts`.
- Giới hạn còn lại (đã báo, KHÔNG bịa): `useScopes` GIỮ REST (chưa có scope-catalog GraphQL — scope
  trải nhiều module, không phải read đơn của identity); `grantCount` ở `useRbacUsers` = 0 (thuộc
  module admin-users, ngoài phạm vi); tên scope hiển thị bằng scopeId; SUPER_ADMIN không hiện trong
  matrix-by-permission (BE bypass).
- KHÔNG tsc/build/commit trong change này (theo yêu cầu).
