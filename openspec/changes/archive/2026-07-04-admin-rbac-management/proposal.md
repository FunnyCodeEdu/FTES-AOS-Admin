# admin-rbac-management — Console RBAC cho Super Admin

## Why

Theo `docs/ADMIN-ARCHITECTURE.md`, mô hình 4 tầng (Super Admin / Admin theo mảng / Moderator /
CTV scoped) sống ở BE (`identity-rbac` + `admin-api`), nhưng Super Admin cần một console để
vận hành nó: định nghĩa role (tập permission), xem catalog permission leaf, gán/tước role cho
user, bổ nhiệm "admin theo mảng" (admin-users / admin-academic / admin-commerce /
admin-community / admin-operations — mỗi mảng là một preset role), và cấp **scoped grant**
(GROUP/SUBJECT/RESOURCE_SET, có thời hạn + lý do) cho Moderator/CTV. Không có console này thì
mọi thay đổi quyền phải sửa tay DB — không audit được, không có confirm nêu hệ quả, trái
nguyên tắc "mọi mutation nguy hiểm có confirm + audit".

## What Changes

- Console `/system/rbac/*` (gate theo permission `rbac.*`, thực tế chỉ Super Admin có):
  - **Roles**: danh sách, tạo/sửa role = chọn tập permission trên cây theo domain, clone role.
  - **Permission catalog**: danh sách permission leaf nhóm theo domain, mô tả, role nào chứa.
  - **User access**: search user → xem role + scoped grants; gán/tước role; gán admin mảng
    bằng preset role của mảng.
  - **Scoped grants**: cấp quyền theo scope (GROUP/SUBJECT/RESOURCE_SET) cho Moderator/CTV,
    bắt buộc thời hạn + ghi chú lý do; thu hồi grant.
  - **Access matrix**: "ai có quyền gì" — matrix + search 2 chiều (theo user, theo permission).
- Mọi mutation quyền: confirm dialog nêu hệ quả + hiển thị **diff trước/sau**; BE ghi audit,
  FE hiển thị tham chiếu audit sau khi thành công.

## Capabilities

### New Capabilities
- `rbac-role-management`: CRUD + clone role (role = tập permission, không logic FE theo tên role).
- `rbac-permission-catalog`: catalog permission leaf theo domain, mô tả, tra cứu ngược role.
- `rbac-user-role-assignment`: gán/tước role cho user, bổ nhiệm admin theo mảng bằng preset.
- `rbac-scoped-grants`: cấp/thu hồi grant theo scope có thời hạn + lý do cho Moderator/CTV.
- `rbac-access-review`: matrix "ai có quyền gì", search theo user/permission, diff + confirm + audit.

### Modified Capabilities
Không sửa capability nào.

## Impact

- Route mới: `/system/rbac/roles`, `/system/rbac/roles/:id`, `/system/rbac/permissions`,
  `/system/rbac/users`, `/system/rbac/users/:userId`, `/system/rbac/matrix`.
- Feature folder: `src/features/rbac/` (pages + api + components: PermissionTree, RoleDiff,
  ScopedGrantForm, AccessMatrix).
- API BE tiêu thụ: `/api/v1/admin/rbac/*` (roles, permissions, user access, grants, matrix) —
  nhiều endpoint đánh dấu assumption chờ BE chốt (xem design.md).
- Permission gates: `rbac.role.read/manage`, `rbac.permission.read`, `rbac.assignment.manage`,
  `rbac.grant.manage`, `rbac.matrix.read` (tên leaf là assumption theo catalog BE).
- Phụ thuộc: `admin-foundation` (shell, guard, API client, `<Can>`).
