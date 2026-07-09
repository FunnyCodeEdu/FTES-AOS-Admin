import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import type { CtvGrant, CtvMember, GrantHistoryEntry, PaginatedResponse } from "../shared/types";

// Phase 3: grant mutation qua layer CTV riêng `/api/v1/admin/ctv/members/{userId}/grants/*`
// (gate admin.ctv.manage — ADMIN có; endpoint ép roleCode=CTV, giữ escalation-guard).
// memberId == userId (CtvMember.id = userId). History từ ctv_grant_history.
const queryKeys = {
  members: (params: Record<string, unknown>) => ["ctv", "members", params] as const,
  member: (id: string) => ["ctv", "member", id] as const,
  history: (id: string, params: Record<string, unknown>) => ["ctv", "member", id, "history", params] as const,
};

export interface MemberListParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

export function useMembers(params: MemberListParams = {}) {
  return useQuery<PaginatedResponse<CtvMember>, Error>({
    queryKey: queryKeys.members(params as Record<string, unknown>),
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<CtvMember>>("/ctv/members", {
        params: {
          ...(params.search ? { search: params.search } : {}),
          page: params.page ?? 1,
          pageSize: params.pageSize ?? 10,
        },
      });
      return res.data;
    },
  });
}

export interface MemberDetail {
  member: CtvMember;
  grants: CtvGrant[];
  kpi: {
    resourcesProcessed: number;
    postsModerated: number;
  };
}

export function useMember(id: string | undefined) {
  return useQuery<MemberDetail, Error>({
    queryKey: queryKeys.member(id ?? ""),
    queryFn: async () => {
      const res = await apiClient.get<MemberDetail>(`/ctv/members/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export interface ExtendGrantsInput {
  memberId: string;
  grantIds: string[];
  newExpiresAt: string;
  reason: string;
}

export function useExtendGrants() {
  const qc = useQueryClient();
  return useMutation<void, Error, ExtendGrantsInput>({
    mutationFn: async ({ memberId, grantIds, newExpiresAt, reason }) => {
      await apiClient.post(`/ctv/members/${memberId}/grants/extend`, {
        grantIds,
        expiresAt: newExpiresAt,
        reason,
      });
    },
    onSuccess: (_, { memberId }) => {
      qc.invalidateQueries({ queryKey: ["ctv", "member", memberId] });
      qc.invalidateQueries({ queryKey: ["ctv", "members"] });
      qc.invalidateQueries({ queryKey: ["ctv", "member", memberId, "history"] });
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      qc.invalidateQueries({ queryKey: ["ctv", "me", "scopes"] });
    },
  });
}

export interface ExpandGrantsInput {
  memberId: string;
  scopes: { scopeType: string; scopeId: string; scopeName: string }[];
  permissions: string[];
  expiresAt: string;
  reason: string;
}

export function useExpandGrants() {
  const qc = useQueryClient();
  return useMutation<void, Error, ExpandGrantsInput>({
    // expand = cấp thêm role CTV scoped (approach a). permissions[] là metadata; role CTV quyết quyền.
    mutationFn: async ({ memberId, scopes, expiresAt, reason }) => {
      await apiClient.post(`/ctv/members/${memberId}/grants/expand`, {
        scopes: scopes.map((s) => ({ scopeType: s.scopeType, scopeId: s.scopeId })),
        expiresAt,
        reason,
      });
    },
    onSuccess: (_, { memberId }) => {
      qc.invalidateQueries({ queryKey: ["ctv", "member", memberId] });
      qc.invalidateQueries({ queryKey: ["ctv", "members"] });
      qc.invalidateQueries({ queryKey: ["ctv", "member", memberId, "history"] });
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      qc.invalidateQueries({ queryKey: ["ctv", "me", "scopes"] });
    },
  });
}

export interface RevokeGrantsInput {
  memberId: string;
  grantIds: string[];
  reason: string;
}

export function useRevokeGrants() {
  const qc = useQueryClient();
  return useMutation<void, Error, RevokeGrantsInput>({
    mutationFn: async ({ memberId, grantIds, reason }) => {
      await apiClient.post(`/ctv/members/${memberId}/grants/revoke`, { grantIds, reason });
    },
    onSuccess: (_, { memberId }) => {
      qc.invalidateQueries({ queryKey: ["ctv", "member", memberId] });
      qc.invalidateQueries({ queryKey: ["ctv", "members"] });
      qc.invalidateQueries({ queryKey: ["ctv", "member", memberId, "history"] });
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      qc.invalidateQueries({ queryKey: ["ctv", "me", "scopes"] });
    },
  });
}

export function useGrantHistory(memberId: string | undefined, params: { page?: number; pageSize?: number } = {}) {
  return useQuery<PaginatedResponse<GrantHistoryEntry>, Error>({
    queryKey: queryKeys.history(memberId ?? "", params as Record<string, unknown>),
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<GrantHistoryEntry>>(
        `/ctv/members/${memberId}/history`,
        { params: { page: params.page ?? 1, pageSize: params.pageSize ?? 10 } }
      );
      return res.data;
    },
    enabled: !!memberId,
  });
}
