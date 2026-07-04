import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
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
  PaginatedResponse,
  PermissionCatalog,
  RevokeGrantRequest,
  Role,
  ScopeItem,
  UpdateRoleRequest,
  UserAccessDetail,
  UserAccessSummary,
  UserScopedGrant,
} from "../types";

// --- Roles ---

export function useRoles(search: string, page: number, size: number) {
  return useQuery<PaginatedResponse<Role>, Error>({
    queryKey: ["rbac", "roles", { search, page, size }],
    queryFn: () =>
      apiClient
        .get("/rbac/roles", { params: { search, page, size } })
        .then((r) => r.data as PaginatedResponse<Role>),
  });
}

export function useRole(roleId: string | undefined) {
  return useQuery<Role, Error>({
    queryKey: ["rbac", "role", roleId],
    queryFn: () => apiClient.get(`/rbac/roles/${roleId}`).then((r) => r.data as Role),
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
    queryFn: () => apiClient.get("/rbac/permissions").then((r) => r.data as PermissionCatalog),
    staleTime: 10 * 60 * 1000,
  });
}

// --- Users / Access ---

export function useRbacUsers(search: string, page: number, size: number) {
  return useQuery<PaginatedResponse<UserAccessSummary>, Error>({
    queryKey: ["rbac", "users", { search, page, size }],
    queryFn: () =>
      apiClient
        .get("/rbac/users", { params: { search, page, size } })
        .then((r) => r.data as PaginatedResponse<UserAccessSummary>),
  });
}

export function useUserAccess(userId: string | undefined) {
  return useQuery<UserAccessDetail, Error>({
    queryKey: ["rbac", "user-access", userId],
    queryFn: () =>
      apiClient.get(`/rbac/users/${userId}/access`).then((r) => r.data as UserAccessDetail),
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
        .delete(`/rbac/grants/${grantId}`, { data: { reason } as RevokeGrantRequest })
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
      apiClient
        .get("/rbac/matrix", { params: { userId } })
        .then((r) => (r.data as { effective: MatrixEntry[] }).effective),
    enabled: !!userId,
  });
}

export function useMatrixByPermission(permission: string | undefined) {
  return useQuery<MatrixByPermissionEntry[], Error>({
    queryKey: ["rbac", "matrix", "permission", permission],
    queryFn: () =>
      apiClient
        .get("/rbac/matrix", { params: { permission } })
        .then((r) => (r.data as { users: MatrixByPermissionEntry[] }).users),
    enabled: !!permission,
  });
}

// --- Audit ---

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
