import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import { graphqlRequest } from "../../../shared/api/graphql";
import { handleAdminMutationError } from "../../../shared/api/errors";
import { usersKeys } from "./users.keys";
import type {
  ExportJob,
  ImpersonationSession,
  LearningSummary,
  PaginatedResponse,
  SecurityEvent,
  SecurityLogParams,
  Session,
  TransactionSummary,
  UserListParams,
  UserProfile,
  UserRow,
} from "../types";

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

const ADMIN_USER_SECURITY_LOG_QUERY = `query AdminUserSecurityLog($userId: ID!, $page: Int, $pageSize: Int) {
  adminUserSecurityLog(userId: $userId, page: { page: $page, size: $pageSize }) {
    items {
      id
      type
      timestamp
      ip
      userAgent
      detail
    }
    total
    page
    size
  }
}`;

// --- List ---

export function useUsers(params: UserListParams) {
  return useQuery<PaginatedResponse<UserRow>, Error>({
    queryKey: usersKeys.list(params),
    queryFn: () =>
      graphqlRequest<{
        adminUsers: {
          items: Array<{
            id: string;
            username: string;
            email: string;
            displayName?: string;
            status: string;
            roles: string[];
            createdAt?: string;
          }>;
          total: number;
          page: number;
          size: number;
        };
      }>(ADMIN_USERS_QUERY, {
        filter: {
          ...(params.search ? { q: params.search } : {}),
          ...(params.status ? { status: params.status } : {}),
          ...(params.role ? { role: params.role } : {}),
        },
        page: { page: Math.max(0, params.page - 1), size: params.pageSize },
      }).then((r) => ({
        items: r.adminUsers.items.map((item) => ({
          id: item.id,
          fullName: item.displayName || item.username,
          email: item.email,
          roleNames: item.roles ?? [],
          status: item.status as UserRow["status"],
          createdAt: item.createdAt ?? "",
        })),
        total: r.adminUsers.total,
        page: (r.adminUsers.page ?? 0) + 1,
        pageSize: r.adminUsers.size,
      })),
    placeholderData: (previous) => previous,
  });
}

// --- Detail ---

export function useUser(userId: string | undefined) {
  return useQuery<UserProfile, Error>({
    queryKey: usersKeys.detail(userId),
    queryFn: () =>
      graphqlRequest<{
        adminUser: {
          id: string;
          username: string;
          email: string;
          displayName?: string;
          status: string;
          roles: string[];
          createdAt?: string;
        };
      }>(ADMIN_USER_QUERY, { id: userId }).then((r) => ({
        id: r.adminUser.id,
        fullName: r.adminUser.displayName || r.adminUser.username,
        email: r.adminUser.email,
        status: r.adminUser.status as UserProfile["status"],
        roles: r.adminUser.roles.map((name) => ({ roleId: name, name })),
        createdAt: r.adminUser.createdAt ?? "",
        updatedAt: r.adminUser.createdAt ?? "",
      })),
    enabled: !!userId,
  });
}

export function useLearningSummary(userId: string | undefined) {
  return useQuery<LearningSummary, Error>({
    queryKey: usersKeys.learning(userId),
    queryFn: () =>
      apiClient.get(`/users/${userId}/learning-summary`).then((r) => r.data as LearningSummary),
    enabled: !!userId,
  });
}

export function useTransactionSummary(userId: string | undefined) {
  return useQuery<TransactionSummary, Error>({
    queryKey: usersKeys.transactions(userId),
    queryFn: () =>
      apiClient.get(`/users/${userId}/transactions-summary`).then((r) => r.data as TransactionSummary),
    enabled: !!userId,
  });
}

export function useSessions(userId: string | undefined) {
  return useQuery<{ items: Session[] }, Error>({
    queryKey: usersKeys.sessions(userId),
    queryFn: () => apiClient.get(`/users/${userId}/sessions`).then((r) => r.data as { items: Session[] }),
    enabled: !!userId,
  });
}

const MOCK_ENABLED_SECURITY_LOG = false;

export function useSecurityLog(userId: string | undefined, params: SecurityLogParams) {
  return useQuery<PaginatedResponse<SecurityEvent>, Error>({
    queryKey: usersKeys.securityLog(userId, params),
    queryFn: async () => {
      if (MOCK_ENABLED_SECURITY_LOG) {
        const total = 6;
        const items = Array.from({ length: Math.min(params.pageSize, total - (params.page - 1) * params.pageSize) }, (_, i) => {
          const idx = (params.page - 1) * params.pageSize + i;
          return {
            id: `sec-${idx}`,
            eventType: params.eventType ?? "LOGIN_FAILED",
            timestamp: new Date(Date.now() - idx * 3600000).toISOString(),
            actor: "system",
            reason: "mock",
          } as SecurityEvent;
        });
        return { items, total, page: params.page, pageSize: params.pageSize };
      }
      const data = await graphqlRequest<{ adminUserSecurityLog: { items: Array<{ id: string; type: string; timestamp: string; ip?: string; userAgent?: string; detail?: string }>; total: number; page?: number; size?: number } }>(ADMIN_USER_SECURITY_LOG_QUERY, {
        userId,
        page: Math.max(0, params.page - 1),
        pageSize: params.pageSize,
      });
      return {
        items: data.adminUserSecurityLog.items.map((item) => ({
          id: item.id,
          eventType: item.type,
          timestamp: item.timestamp,
          actor: undefined,
          reason: item.detail,
          metadata: { ip: item.ip, userAgent: item.userAgent },
        })),
        total: data.adminUserSecurityLog.total,
        page: (data.adminUserSecurityLog.page ?? 0) + 1,
        pageSize: data.adminUserSecurityLog.size ?? params.pageSize,
      };
    },
    enabled: !!userId,
  });
}

// --- Account actions ---

export function useLockUser(userId: string) {
  const queryClientLocal = useQueryClient();
  return useMutation<UserProfile, Error, { reason: string }>({
    mutationFn: (values) =>
      apiClient.post(`/users/${userId}/lock`, values).then((r) => r.data as UserProfile),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: usersKeys.detail(userId) });
      queryClientLocal.invalidateQueries({ queryKey: usersKeys.lists() });
      queryClientLocal.invalidateQueries({ queryKey: usersKeys.securityLogs(userId) });
    },
    onError: handleAdminMutationError,
  });
}

export function useUnlockUser(userId: string) {
  const queryClientLocal = useQueryClient();
  return useMutation<UserProfile, Error, { reason: string }>({
    mutationFn: (values) =>
      apiClient.post(`/users/${userId}/unlock`, values).then((r) => r.data as UserProfile),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: usersKeys.detail(userId) });
      queryClientLocal.invalidateQueries({ queryKey: usersKeys.lists() });
      queryClientLocal.invalidateQueries({ queryKey: usersKeys.securityLogs(userId) });
    },
    onError: handleAdminMutationError,
  });
}

export function useForceResetPassword(userId: string) {
  const queryClientLocal = useQueryClient();
  return useMutation<{ resetIssuedAt: string }, Error, { notifyUser: boolean }>({
    mutationFn: (values) =>
      apiClient
        .post(`/users/${userId}/force-reset-password`, values)
        .then((r) => r.data as { resetIssuedAt: string }),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: usersKeys.securityLogs(userId) });
    },
    onError: handleAdminMutationError,
  });
}

export function useRevokeSessions(userId: string) {
  const queryClientLocal = useQueryClient();
  return useMutation<{ revokedCount: number }, Error, { sessionIds: string[] } | "all">({
    mutationFn: (payload) =>
      apiClient
        .post(`/users/${userId}/sessions/revoke`, payload)
        .then((r) => r.data as { revokedCount: number }),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: usersKeys.sessions(userId) });
      queryClientLocal.invalidateQueries({ queryKey: usersKeys.securityLogs(userId) });
    },
    onError: handleAdminMutationError,
  });
}

// --- Role assignment ---

export function useUpdateUserRoles(userId: string) {
  const queryClientLocal = useQueryClient();
  return useMutation<UserProfile, Error, { roleIds: string[]; reason: string }>({
    mutationFn: (values) =>
      apiClient.put(`/users/${userId}/roles`, values).then((r) => r.data as UserProfile),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: usersKeys.detail(userId) });
      queryClientLocal.invalidateQueries({ queryKey: usersKeys.lists() });
    },
    onError: handleAdminMutationError,
  });
}

// --- Impersonation ---

export function useImpersonate(userId: string) {
  return useMutation<ImpersonationSession, Error>({
    mutationFn: () =>
      apiClient.post(`/users/${userId}/impersonate`).then((r) => r.data as ImpersonationSession),
  });
}

// --- Export ---

export function useExportUsers() {
  return useMutation<{ jobId: string }, Error, UserListParams>({
    mutationFn: (filters) =>
      apiClient.post("/users/export", filters).then((r) => r.data as { jobId: string }),
  });
}

export function useExportJob(jobId: string | undefined) {
  return useQuery<ExportJob, Error>({
    queryKey: usersKeys.export(jobId),
    queryFn: () => apiClient.get(`/users/export/${jobId}`).then((r) => r.data as ExportJob),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "processing" ? 2000 : false;
    },
  });
}

// Helper to refresh permissions after a 403 on mutation
export function useRefreshMeOnForbidden() {
  const queryClientLocal = useQueryClient();
  return () => queryClientLocal.invalidateQueries({ queryKey: ["auth", "me"] });
}
