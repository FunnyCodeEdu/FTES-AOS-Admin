import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
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

// --- List ---

export function useUsers(params: UserListParams) {
  return useQuery<PaginatedResponse<UserRow>, Error>({
    queryKey: usersKeys.list(params),
    queryFn: () => apiClient.get("/users", { params }).then((r) => r.data as PaginatedResponse<UserRow>),
    placeholderData: (previous) => previous,
  });
}

// --- Detail ---

export function useUser(userId: string | undefined) {
  return useQuery<UserProfile, Error>({
    queryKey: usersKeys.detail(userId),
    queryFn: () => apiClient.get(`/users/${userId}`).then((r) => r.data as UserProfile),
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

export function useSecurityLog(userId: string | undefined, params: SecurityLogParams) {
  return useQuery<PaginatedResponse<SecurityEvent>, Error>({
    queryKey: usersKeys.securityLog(userId, params),
    queryFn: () =>
      apiClient
        .get(`/users/${userId}/security-log`, { params })
        .then((r) => r.data as PaginatedResponse<SecurityEvent>),
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
