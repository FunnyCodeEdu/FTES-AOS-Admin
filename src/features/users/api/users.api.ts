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

const ADMIN_USERS_QUERY = `query AdminUsers($page: Int, $pageSize: Int, $search: String, $role: String, $status: String, $campus: String, $sortBy: String, $sortOrder: String) {
  adminUsers(page: $page, pageSize: $pageSize, search: $search, role: $role, status: $status, campus: $campus, sortBy: $sortBy, sortOrder: $sortOrder) {
    items {
      id
      fullName
      email
      avatarUrl
      roleNames
      status
      campus
      createdAt
    }
    total
    page
    pageSize
  }
}`;

const ADMIN_USER_QUERY = `query AdminUser($id: ID!) {
  adminUser(id: $id) {
    id
    fullName
    email
    avatarUrl
    phone
    status
    lockReason
    campus
    roles { roleId name }
    createdAt
    updatedAt
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
      graphqlRequest<{ adminUsers: PaginatedResponse<UserRow> }>(ADMIN_USERS_QUERY, {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        role: params.role,
        status: params.status,
        campus: params.campus,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      }).then((r) => r.adminUsers),
    placeholderData: (previous) => previous,
  });
}

// --- Detail ---

export function useUser(userId: string | undefined) {
  return useQuery<UserProfile, Error>({
    queryKey: usersKeys.detail(userId),
    queryFn: () =>
      graphqlRequest<{ adminUser: UserProfile }>(ADMIN_USER_QUERY, { id: userId }).then(
        (r) => r.adminUser
      ),
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
        page: params.page,
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
        page: data.adminUserSecurityLog.page ?? params.page,
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
