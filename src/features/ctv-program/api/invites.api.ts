import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiClient } from "../../../shared/api/client";
import type { CtvInvite, PaginatedResponse } from "../shared/types";

const queryKeys = {
  invites: (params: Record<string, unknown>) => ["ctv", "invites", params] as const,
  invite: (id: string) => ["ctv", "invite", id] as const,
};

// BE conflict (409, errorCode CTV_INVITE_PENDING) — message backend kết thúc bằng id invite
// pending; interceptor giữ errorCode + message trong ApiError (bỏ response gốc).
function isPendingConflict(err: unknown): boolean {
  return err instanceof ApiError && err.errorCode === "CTV_INVITE_PENDING";
}

function extractPendingInviteId(err: unknown): string {
  return err instanceof ApiError ? (err.message.match(/[\w-]+$/)?.[0] ?? "") : "";
}

export interface InviteListParams {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export function useInvites(params: InviteListParams = {}) {
  return useQuery<PaginatedResponse<CtvInvite>, Error>({
    queryKey: queryKeys.invites(params as Record<string, unknown>),
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<CtvInvite>>("/ctv/invites", {
        params: {
          ...(params.status ? { status: params.status } : {}),
          ...(params.search ? { search: params.search } : {}),
          page: params.page ?? 1,
          pageSize: params.pageSize ?? 10,
        },
      });
      return res.data;
    },
  });
}

export function useInvite(id: string | undefined) {
  return useQuery<CtvInvite, Error>({
    queryKey: queryKeys.invite(id ?? ""),
    queryFn: async () => {
      const res = await apiClient.get<CtvInvite>(`/ctv/invites/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export interface CreateInviteInput {
  email: string;
  scopes: { scopeType: string; scopeId: string; scopeName: string }[];
  permissions: string[];
  grantExpiresAt: string;
  note?: string;
}

export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation<CtvInvite, Error, CreateInviteInput>({
    mutationFn: async (input) => {
      try {
        const res = await apiClient.post<CtvInvite>("/ctv/invites", {
          email: input.email,
          scopes: input.scopes.map((s) => ({ scopeType: s.scopeType, scopeId: s.scopeId })),
          permissions: input.permissions,
          grantExpiresAt: input.grantExpiresAt,
          ...(input.note ? { note: input.note } : {}),
        });
        return res.data;
      } catch (err) {
        // Preserve mock's DUPLICATE_PENDING:<id> contract that InviteListPage parses.
        if (isPendingConflict(err)) {
          throw new Error(`DUPLICATE_PENDING:${extractPendingInviteId(err)}`);
        }
        throw err;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ctv", "invites"] }),
  });
}

export interface RevokeInviteInput {
  id: string;
  reason: string;
}

export function useRevokeInvite() {
  const qc = useQueryClient();
  return useMutation<void, Error, RevokeInviteInput>({
    mutationFn: async ({ id, reason }) => {
      await apiClient.post<CtvInvite>(`/ctv/invites/${id}/revoke`, { reason });
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["ctv", "invites"] });
      qc.invalidateQueries({ queryKey: ["ctv", "invite", id] });
    },
  });
}

export function useResendInvite() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiClient.post<CtvInvite>(`/ctv/invites/${id}/resend`);
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["ctv", "invites"] });
      qc.invalidateQueries({ queryKey: ["ctv", "invite", id] });
    },
  });
}
