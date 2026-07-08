import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import { graphqlRequest } from "../../../shared/api/graphql";
import { queryClient } from "../../../shared/api/queryClient";
import { useAuthStore } from "../../auth/store";
import type {
  AssignRoleRequest,
  AuditEntry,
  CloneRoleRequest,
  CreateGrantRequest,
  CreateRoleRequest,
  MatrixByPermissionEntry,
  MatrixEntry,
  MatrixSource,
  PaginatedResponse,
  PermissionCatalog,
  PermissionLeaf,
  Role,
  ScopeItem,
  UpdateRoleRequest,
  UserAccessDetail,
  UserAccessSummary,
  UserScopedGrant,
} from "../types";

// ---------------------------------------------------------------------------
// READ qua GraphQL (BFF admin read gateway) — BE KHÔNG có REST read cho RBAC.
// Query có sẵn (guard admin.rbac.read): rbacRoles, rbacPermissions, rbacGrants,
// cùng adminUsers/adminUser cho tra cứu user. Mutation (POST/PUT/DELETE) GIỮ REST
// vì BE có command REST tương ứng.
// ---------------------------------------------------------------------------

const RBAC_ROLES_QUERY = `query RbacRoles {
  rbacRoles {
    id
    code
    name
    description
    permissionCodes
  }
}`;

const RBAC_PERMISSIONS_QUERY = `query RbacPermissions {
  rbacPermissions {
    code
    domain
    description
  }
}`;

const RBAC_GRANTS_QUERY = `query RbacGrants($userId: ID!) {
  rbacGrants(userId: $userId) {
    userId
    roleCode
    scopeType
    scopeId
    expiresAt
  }
}`;

const ADMIN_USERS_QUERY = `query AdminUsers($filter: AdminUserFilter, $page: PageInput) {
  adminUsers(filter: $filter, page: $page) {
    items {
      id
      username
      email
      displayName
      status
      roles
      createdAt
    }
    total
    page
    size
  }
}`;

const ADMIN_USER_QUERY = `query AdminUser($id: ID!) {
  adminUser(id: $id) {
    id
    username
    email
    displayName
    status
    roles
    createdAt
  }
}`;

interface RbacRoleGql {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  permissionCodes: string[];
}

interface RbacPermissionGql {
  code: string;
  domain: string;
  description?: string | null;
}

interface RbacGrantGql {
  userId: string;
  roleCode: string;
  scopeType: string;
  scopeId?: string | null;
  expiresAt?: string | null;
}

// GraphQL AdminRole KHÔNG có: isPreset, presetDomain, userCount, updatedAt.
// permissionCount suy từ permissionCodes.length (dữ liệu thật, không bịa).
function mapRole(g: RbacRoleGql): Role {
  return {
    id: g.id,
    name: g.name,
    description: g.description ?? undefined,
    // TODO(BE): AdminRole GraphQL thiếu isPreset → tạm false (RoleListPage hiện "Tuỳ chỉnh").
    isPreset: false,
    // TODO(BE): thiếu presetDomain.
    presetDomain: undefined,
    permissionCount: g.permissionCodes?.length ?? 0,
    // TODO(BE): thiếu userCount (số user đang giữ role) → 0. RoleEditor cảnh báo "ảnh hưởng N user" sẽ luôn 0.
    userCount: 0,
    // TODO(BE): thiếu updatedAt → "".
    updatedAt: "",
    permissions: g.permissionCodes ?? [],
  };
}

// --- Roles ---

export function useRoles(search: string, page: number, size: number) {
  return useQuery<PaginatedResponse<Role>, Error>({
    queryKey: ["rbac", "roles", { search, page, size }],
    queryFn: () =>
      graphqlRequest<{ rbacRoles: RbacRoleGql[] }>(RBAC_ROLES_QUERY).then((r) => {
        const all = (r.rbacRoles ?? []).map(mapRole);
        // rbacRoles không nhận filter/paginate → lọc + phân trang phía client.
        const term = search.trim().toLowerCase();
        const filtered = term
          ? all.filter(
              (role) =>
                role.name.toLowerCase().includes(term) ||
                (role.description ?? "").toLowerCase().includes(term)
            )
          : all;
        const start = Math.max(0, page - 1) * size;
        return {
          items: filtered.slice(start, start + size),
          total: filtered.length,
        };
      }),
  });
}

export function useRole(roleId: string | undefined) {
  return useQuery<Role, Error>({
    queryKey: ["rbac", "role", roleId],
    queryFn: () =>
      graphqlRequest<{ rbacRoles: RbacRoleGql[] }>(RBAC_ROLES_QUERY).then((r) => {
        // Không có query 1 role → lấy từ danh sách.
        const found = (r.rbacRoles ?? []).find((role) => role.id === roleId);
        if (!found) {
          throw new Error("Không tìm thấy vai trò");
        }
        return mapRole(found);
      }),
    enabled: !!roleId,
  });
}

export function useCreateRole() {
  return useMutation<Role, Error, CreateRoleRequest>({
    mutationFn: (values) => apiClient.post("/rbac/roles", values).then((r) => r.data as Role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rbac", "roles"] });
      queryClient.invalidateQueries({ queryKey: ["rbac", "permissions"] });
      queryClient.invalidateQueries({ queryKey: ["rbac", "matrix"] });
    },
  });
}

export function useUpdateRole(roleId: string) {
  return useMutation<Role, Error, UpdateRoleRequest>({
    mutationFn: (values) =>
      apiClient.put(`/rbac/roles/${roleId}`, values).then((r) => r.data as Role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rbac", "roles"] });
      queryClient.invalidateQueries({ queryKey: ["rbac", "role", roleId] });
      queryClient.invalidateQueries({ queryKey: ["rbac", "permissions"] });
      queryClient.invalidateQueries({ queryKey: ["rbac", "matrix"] });
    },
  });
}

export function useCloneRole(roleId: string) {
  return useMutation<Role, Error, CloneRoleRequest>({
    mutationFn: (values) =>
      apiClient
        .post(`/rbac/roles/${roleId}/clone`, values)
        .then((r) => r.data as Role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rbac", "roles"] });
      queryClient.invalidateQueries({ queryKey: ["rbac", "permissions"] });
      queryClient.invalidateQueries({ queryKey: ["rbac", "matrix"] });
    },
  });
}

// --- Permissions ---

export function usePermissionCatalog() {
  return useQuery<PermissionCatalog, Error>({
    queryKey: ["rbac", "permissions"],
    queryFn: () =>
      Promise.all([
        graphqlRequest<{ rbacPermissions: RbacPermissionGql[] }>(RBAC_PERMISSIONS_QUERY),
        graphqlRequest<{ rbacRoles: RbacRoleGql[] }>(RBAC_ROLES_QUERY),
      ]).then(([permsRes, rolesRes]) => {
        // roles-của-permission suy từ rbacRoles.permissionCodes (dữ liệu thật).
        const rolesByPerm = new Map<string, string[]>();
        for (const role of rolesRes.rbacRoles ?? []) {
          for (const code of role.permissionCodes ?? []) {
            const list = rolesByPerm.get(code) ?? [];
            list.push(role.name);
            rolesByPerm.set(code, list);
          }
        }
        const byDomain = new Map<string, PermissionLeaf[]>();
        for (const p of permsRes.rbacPermissions ?? []) {
          const leaf: PermissionLeaf = {
            key: p.code,
            description: p.description ?? "",
            // TODO(BE): AdminPermission GraphQL thiếu "scopable" → tạm false.
            // Hệ quả: ScopedGrantModal lọc permission scopable ra rỗng (không cấp grant scoped qua UI được cho tới khi BE thêm field).
            scopable: false,
            roles: rolesByPerm.get(p.code) ?? [],
          };
          const list = byDomain.get(p.domain) ?? [];
          list.push(leaf);
          byDomain.set(p.domain, list);
        }
        return {
          domains: Array.from(byDomain.entries()).map(([domain, permissions]) => ({
            domain,
            permissions,
          })),
        };
      }),
    staleTime: 10 * 60 * 1000,
  });
}

// --- Users / Access ---

export function useRbacUsers(search: string, page: number, size: number) {
  return useQuery<PaginatedResponse<UserAccessSummary>, Error>({
    queryKey: ["rbac", "users", { search, page, size }],
    queryFn: () =>
      graphqlRequest<{
        adminUsers: {
          items: Array<{
            id: string;
            username: string;
            email: string;
            displayName?: string | null;
            status: string;
            roles: string[];
            createdAt?: string | null;
          }>;
          total: number;
          page: number;
          size: number;
        };
      }>(ADMIN_USERS_QUERY, {
        filter: search.trim() ? { q: search.trim() } : undefined,
        page: { page: Math.max(0, page - 1), size },
      }).then((r) => ({
        items: (r.adminUsers.items ?? []).map((u) => ({
          userId: u.id,
          email: u.email,
          fullName: u.displayName || u.username,
          roles: u.roles ?? [],
          // TODO(BE): adminUsers không trả grantCount (số scoped grant/user) → 0.
          grantCount: 0,
        })),
        total: r.adminUsers.total,
      })),
  });
}

export function useUserAccess(userId: string | undefined) {
  return useQuery<UserAccessDetail, Error>({
    queryKey: ["rbac", "user-access", userId],
    queryFn: () =>
      Promise.all([
        graphqlRequest<{
          adminUser: {
            id: string;
            username: string;
            email: string;
            displayName?: string | null;
          };
        }>(ADMIN_USER_QUERY, { id: userId }),
        graphqlRequest<{ rbacGrants: RbacGrantGql[] }>(RBAC_GRANTS_QUERY, { userId }),
      ]).then(([userRes, grantsRes]) => ({
        user: {
          id: userRes.adminUser.id,
          email: userRes.adminUser.email,
          fullName: userRes.adminUser.displayName || userRes.adminUser.username,
          avatarUrl: undefined,
        },
        // rbacGrants = ROLE-grant (role + scope + expiresAt) → map vào tab "Vai trò".
        roles: (grantsRes.rbacGrants ?? []).map((g) => ({
          // TODO(BE): grant trả roleCode, KHÔNG phải role UUID → so khớp currentRoleIds (dùng rbacRoles.id
          // trong AssignRoleModal) sẽ lệch; nút disable "đã có role" có thể không chính xác.
          roleId: g.roleCode,
          // TODO(BE): chưa có display name của role trong grant → hiển thị mã role.
          name: g.roleCode,
          // TODO(BE): grant không trả assignedAt/assignedBy.
          assignedAt: "",
          assignedBy: "",
        })),
        // TODO(BE): FE UserScopedGrant là PERMISSION-scoped (permission/scopeName/reason/grantedBy...),
        // trong khi BE chỉ có ROLE-grant (rbacGrants). Không có read cho permission-scoped grant → tab
        // "Scoped grants" tạm rỗng cho tới khi BE bổ sung query.
        grants: [] as UserScopedGrant[],
      })),
    enabled: !!userId,
  });
}

export function useAssignRole(userId: string) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const queryClientLocal = useQueryClient();

  return useMutation<UserAccessDetail, Error, AssignRoleRequest>({
    mutationFn: (values) =>
      apiClient
        .post(`/rbac/users/${userId}/roles`, values)
        .then((r) => r.data as UserAccessDetail),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: ["rbac", "user-access", userId] });
      queryClientLocal.invalidateQueries({ queryKey: ["rbac", "users"] });
      queryClientLocal.invalidateQueries({ queryKey: ["rbac", "matrix"] });
      queryClientLocal.invalidateQueries({ queryKey: ["rbac", "user-audit", userId] });
      if (userId === currentUserId) {
        queryClientLocal.invalidateQueries({ queryKey: ["auth", "me"] });
      }
    },
  });
}

export function useRevokeRole(userId: string) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const queryClientLocal = useQueryClient();

  return useMutation<void, Error, { roleId: string; reason: string }>({
    mutationFn: ({ roleId, reason }) =>
      apiClient
        .delete(`/rbac/users/${userId}/roles/${roleId}`, { data: { reason } })
        .then(() => undefined),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: ["rbac", "user-access", userId] });
      queryClientLocal.invalidateQueries({ queryKey: ["rbac", "users"] });
      queryClientLocal.invalidateQueries({ queryKey: ["rbac", "matrix"] });
      queryClientLocal.invalidateQueries({ queryKey: ["rbac", "user-audit", userId] });
      if (userId === currentUserId) {
        queryClientLocal.invalidateQueries({ queryKey: ["auth", "me"] });
      }
    },
  });
}

// --- Scoped Grants ---

export function useCreateGrant(userId: string) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const queryClientLocal = useQueryClient();

  return useMutation<UserScopedGrant, Error, CreateGrantRequest>({
    mutationFn: (values) =>
      apiClient
        .post(`/rbac/users/${userId}/grants`, values)
        .then((r) => r.data as UserScopedGrant),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: ["rbac", "user-access", userId] });
      queryClientLocal.invalidateQueries({ queryKey: ["rbac", "users"] });
      queryClientLocal.invalidateQueries({ queryKey: ["rbac", "matrix"] });
      queryClientLocal.invalidateQueries({ queryKey: ["rbac", "user-audit", userId] });
      if (userId === currentUserId) {
        queryClientLocal.invalidateQueries({ queryKey: ["auth", "me"] });
      }
    },
  });
}

export function useRevokeGrant(userId: string) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const queryClientLocal = useQueryClient();

  return useMutation<void, Error, { grantId: string; reason: string }>({
    mutationFn: ({ grantId, reason }) =>
      apiClient
        .delete(`/rbac/grants/${grantId}`, { data: { reason } })
        .then(() => undefined),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: ["rbac", "user-access", userId] });
      queryClientLocal.invalidateQueries({ queryKey: ["rbac", "users"] });
      queryClientLocal.invalidateQueries({ queryKey: ["rbac", "matrix"] });
      queryClientLocal.invalidateQueries({ queryKey: ["rbac", "user-audit", userId] });
      if (userId === currentUserId) {
        queryClientLocal.invalidateQueries({ queryKey: ["auth", "me"] });
      }
    },
  });
}

// TODO(BE): chưa có GraphQL cho danh mục scope (group/subject/resource-set dạng ScopeItem).
// Giữ REST /rbac/scopes; endpoint này có thể chưa tồn tại → ScopedGrantModal có thể 500 khi chọn scope.
export function useScopes(scopeType: string | undefined, search: string) {
  return useQuery<PaginatedResponse<ScopeItem>, Error>({
    queryKey: ["rbac", "scopes", scopeType, search],
    queryFn: () =>
      apiClient
        .get("/rbac/scopes", { params: { type: scopeType, search } })
        .then((r) => r.data as PaginatedResponse<ScopeItem>),
    enabled: !!scopeType,
  });
}

// --- Matrix ---

export function useMatrixByUser(userId: string | undefined) {
  return useQuery<MatrixEntry[], Error>({
    queryKey: ["rbac", "matrix", "user", userId],
    queryFn: () =>
      Promise.all([
        graphqlRequest<{ rbacGrants: RbacGrantGql[] }>(RBAC_GRANTS_QUERY, { userId }),
        graphqlRequest<{ rbacRoles: RbacRoleGql[] }>(RBAC_ROLES_QUERY),
      ]).then(([grantsRes, rolesRes]) => {
        // Ma trận effective suy từ: grant (user→role+scope) ⋈ role (role→permissionCodes).
        const roleByCode = new Map<string, RbacRoleGql>();
        for (const role of rolesRes.rbacRoles ?? []) {
          roleByCode.set(role.code, role);
        }
        const byPerm = new Map<string, MatrixSource[]>();
        for (const g of grantsRes.rbacGrants ?? []) {
          const role = roleByCode.get(g.roleCode);
          const source: MatrixSource = {
            type: "ROLE",
            name: role?.name ?? g.roleCode,
            scope: g.scopeId
              ? {
                  type: g.scopeType,
                  id: g.scopeId,
                  // TODO(BE): grant không trả tên scope → hiển thị id.
                  name: g.scopeId,
                }
              : undefined,
            expiresAt: g.expiresAt ?? undefined,
          };
          for (const code of role?.permissionCodes ?? []) {
            const list = byPerm.get(code) ?? [];
            list.push(source);
            byPerm.set(code, list);
          }
        }
        return Array.from(byPerm.entries()).map(([permission, sources]) => ({
          permission,
          sources,
        }));
      }),
    enabled: !!userId,
  });
}

export function useMatrixByPermission(permission: string | undefined) {
  return useQuery<MatrixByPermissionEntry[], Error>({
    queryKey: ["rbac", "matrix", "permission", permission],
    // TODO(BE): không có query "users theo permission". Tra ngược cần duyệt toàn bộ user + grant
    // (N+1) hoặc BE thêm query dành riêng. Tạm trả rỗng để tránh REST /rbac/matrix (500).
    queryFn: async () => [] as MatrixByPermissionEntry[],
    enabled: !!permission,
  });
}

// --- Audit ---

// TODO(BE): chưa map sang GraphQL adminAuditLogs (filter theo actorId/resourceId, shape khác
// AuditEntry). Giữ REST /rbac/users/:id/audit; endpoint có thể chưa tồn tại → có thể 500.
export function useUserAudit(userId: string | undefined, page: number, size: number) {
  return useQuery<PaginatedResponse<AuditEntry>, Error>({
    queryKey: ["rbac", "user-audit", userId, page],
    queryFn: () =>
      apiClient
        .get(`/rbac/users/${userId}/audit`, { params: { page, size } })
        .then((r) => r.data as PaginatedResponse<AuditEntry>),
    enabled: !!userId,
  });
}
