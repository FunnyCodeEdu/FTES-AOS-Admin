## 1. Chuyển READ hook sang GraphQL (`src/features/rbac/api/index.ts`)

- [x] 1.1 `useRoles` / `useRole` dùng `rbacRoles`; `permissionCount = permissionCodes.length`; lọc + phân trang client.
- [x] 1.2 `usePermissionCatalog` dùng `rbacPermissions` gom theo domain + suy `roles` từ `rbacRoles`.
- [x] 1.3 `useRbacUsers` dùng `adminUsers`; `useUserAccess` dùng `adminUser` + `rbacGrants`.
- [x] 1.4 `useMatrixByUser` suy effective matrix từ `rbacGrants ⋈ rbacRoles`; `useMatrixByPermission` tạm rỗng.
- [x] 1.5 Field GraphQL thiếu → map tạm + `TODO(BE)`; giữ signature hook; mutation/scopes/audit giữ REST.

## 2. Verify (ngoài phạm vi change này)

- [ ] 2.1 tsc/build — CHỦ Ý bỏ qua theo yêu cầu; chạy khi tích hợp.
