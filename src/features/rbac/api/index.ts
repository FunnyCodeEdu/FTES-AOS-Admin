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
    isPreset
    userCount
  }
}`;

const RBAC_PERMISSIONS_QUERY = `query RbacPermissions {
  rbacPermissions {
    code
    domain
    description
    scopable
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

const RBAC_PERMISSION_GRANTS_QUERY = `query RbacPermissionGrants($userId: ID!) {
  rbacPermissionGrants(userId: $userId) {
    grantId
    permissionCode
    scopeType
    scopeId
    grantedBy
    grantedAt
    expiresAt
  }
}`;

const RBAC_MATRIX_BY_PERMISSION_QUERY = `query RbacMatrixByPermission($permission: String!) {
  rbacMatrixByPermission(permission: $permission) {
    userId
    email
    fullName
    source {
      type
      name
      scopeType
      scopeId
      expiresAt
    }
  }
}`;

const RBAC_USER_AUDIT_QUERY = `query RbacUserAudit($userId: ID!, $page: PageInput) {
  rbacUserAudit(userId: $userId, page: $page) {
    items {
      id
      actorId
      action
      detail
      occurredAt
    }
    total
    page
    size
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
  isPreset: boolean;
  userCount: number;
}

interface RbacPermissionGql {
  code: string;
  domain: string;
  description?: string | null;
  scopable: boolean;
}

interface RbacGrantGql {
  userId: string;
  roleCode: string;
  scopeType: string;
  scopeId?: string | null;
  expiresAt?: string | null;
}

interface RbacPermissionGrantGql {
  grantId: string;
  permissionCode: string;
  scopeType: string;
  scopeId?: string | null;
  grantedBy?: string | null;
  grantedAt?: string | null;
  expiresAt?: string | null;
}

interface RbacMatrixRowGql {
  userId: string;
  email: string;
  fullName?: string | null;
  source: {
    type: string;
    name: string;
    scopeType?: string | null;
    scopeId?: string | null;
    expiresAt?: string | null;
  };
}

interface RbacAuditEntryGql {
  id: string;
  actorId?: string | null;
  action: string;
  detail?: string | null;
  occurredAt: string;
}

// isPreset/userCount đọc thật từ BE (AdminRole.isPreset = is_system; userCount = distinct users).
// permissionCount suy từ permissionCodes.length. presetDomain: identity KHÔNG có field domain cho
// role → giữ code làm nhãn preset. updatedAt: BE chưa expose qua GraphQL read → "".
function mapRole(g: RbacRoleGql): Role {
  return {
    id: g.id,
    name: g.name,
    description: g.description ?? undefined,
    isPreset: g.isPreset,
    // Không có presetDomain riêng; dùng code role làm nhãn (SUPER_ADMIN, ADMIN_ACADEMIC...).
    presetDomain: g.isPreset ? g.code : undefined,
    permissionCount: g.permissionCodes?.length ?? 0,
    userCount: g.userCount ?? 0,
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
            // scopable đọc thật từ BE: permission thuộc ≥1 role có allowed_scope_types khác GLOBAL.
            scopable: p.scopable,
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
        graphqlRequest<{ rbacPermissionGrants: RbacPermissionGrantGql[] }>(
          RBAC_PERMISSION_GRANTS_QUERY,
          { userId }
        ),
      ]).then(([userRes, grantsRes, permGrantsRes]) => ({
        user: {
          id: userRes.adminUser.id,
          email: userRes.adminUser.email,
          fullName: userRes.adminUser.displayName || userRes.adminUser.username,
          avatarUrl: undefined,
        },
        // rbacGrants = ROLE-grant (role + scope + expiresAt) → map vào tab "Vai trò".
        roles: (grantsRes.rbacGrants ?? []).map((g) => ({
          // Grant trả roleCode (không phải role UUID); AssignRoleModal so khớp bằng id nên nút
          // disable "đã có role" chỉ chính xác với role có id trùng — hạn chế đã biết của read model.
          roleId: g.roleCode,
          // Chưa có display name của role trong grant → hiển thị mã role.
          name: g.roleCode,
          // Grant model không trả assignedAt/assignedBy.
          assignedAt: "",
          assignedBy: "",
        })),
        // rbacPermissionGrants = PERMISSION-scoped grant (đúng shape UserScopedGrant).
        // scopeName: chưa có scope catalog read → hiển thị scopeId. reason: KHÔNG lưu ở grant model → "".
        grants: (permGrantsRes.rbacPermissionGrants ?? []).map((g) => ({
          grantId: g.grantId,
          permission: g.permissionCode,
          scopeType: g.scopeType as "GROUP" | "SUBJECT" | "RESOURCE_SET",
          scopeId: g.scopeId ?? "",
          scopeName: g.scopeId ?? "",
          expiresAt: g.expiresAt ?? "",
          reason: "",
          grantedBy: g.grantedBy ?? "",
          grantedAt: g.grantedAt ?? "",
        })) as UserScopedGrant[],
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
    // rbacMatrixByPermission: tra ngược "ai có permission này" qua role-grant + direct-grant.
    // Lưu ý BE: SUPER_ADMIN (engine bypass) KHÔNG xuất hiện trong kết quả. scope.name = scopeId
    // (chưa có scope catalog để resolve tên).
    queryFn: () =>
      graphqlRequest<{ rbacMatrixByPermission: RbacMatrixRowGql[] }>(
        RBAC_MATRIX_BY_PERMISSION_QUERY,
        { permission }
      ).then((r) =>
        (r.rbacMatrixByPermission ?? []).map((row) => ({
          userId: row.userId,
          email: row.email,
          fullName: row.fullName || row.email,
          source: {
            type: row.source.type as "ROLE" | "GRANT",
            name: row.source.name,
            scope: row.source.scopeId
              ? {
                  type: row.source.scopeType ?? "",
                  id: row.source.scopeId,
                  name: row.source.scopeId,
                }
              : undefined,
            expiresAt: row.source.expiresAt ?? undefined,
          },
        }))
      ),
    enabled: !!permission,
  });
}

// --- Audit ---

// rbacUserAudit: lịch sử grant/revoke của user từ identity.security_log (target_id = userId).
// actor = actorId (UUID, chưa resolve tên); details = JSON-string ngữ cảnh; reason không tách riêng.
export function useUserAudit(userId: string | undefined, page: number, size: number) {
  return useQuery<PaginatedResponse<AuditEntry>, Error>({
    queryKey: ["rbac", "user-audit", userId, page],
    queryFn: () =>
      graphqlRequest<{
        rbacUserAudit: {
          items: RbacAuditEntryGql[];
          total: number;
          page: number;
          size: number;
        };
      }>(RBAC_USER_AUDIT_QUERY, {
        userId,
        page: { page: Math.max(0, page - 1), size },
      }).then((r) => ({
        items: (r.rbacUserAudit.items ?? []).map((e) => ({
          id: e.id,
          action: e.action,
          actor: e.actorId ?? "",
          timestamp: e.occurredAt,
          reason: undefined,
          details: e.detail ?? undefined,
        })),
        total: r.rbacUserAudit.total,
      })),
    enabled: !!userId,
  });
}
