import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, coreClient } from "../../../shared/api/client";
import { graphqlRequest } from "../../../shared/api/graphql";
import type { CtvGrant, CtvMember, GrantHistoryEntry, PaginatedResponse } from "../shared/types";

// Phase 3: grant mutation reuse REST grant admin sẵn có `/api/v1/identity/users/{userId}/*`
// (coreClient base /api/v1). memberId == userId (CtvMember.id = userId). History đọc từ
// `rbacUserAudit` (identity.security_log) — nguồn thật cho grant/revoke/expiry-update.
const queryKeys = {
  members: (params: Record<string, unknown>) => ["ctv", "members", params] as const,
  member: (id: string) => ["ctv", "member", id] as const,
  history: (id: string, params: Record<string, unknown>) => ["ctv", "member", id, "history", params] as const,
};

const RBAC_USER_AUDIT_QUERY = `query RbacUserAudit($userId: ID!, $page: PageInput) {
  rbacUserAudit(userId: $userId, page: $page) {
    items { id actorId action detail occurredAt }
    total
    page
    size
  }
}`;

// Map action security_log → nhãn GrantHistoryEntry FE.
function mapAuditAction(action: string): GrantHistoryEntry["action"] {
  if (action.includes("role-revoked") || action.includes("revoked")) return "revoke";
  if (action.includes("expiry")) return "extend";
  if (action.includes("granted")) return "expand";
  return "invite";
}

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
    // extend = đổi expiry từng role grant: PATCH /identity/users/{userId}/roles/{grantId}.
    mutationFn: async ({ memberId, grantIds, newExpiresAt }) => {
      await Promise.all(
        grantIds.map((gid) =>
          coreClient.patch(`/identity/users/${memberId}/roles/${gid}`, { expiresAt: newExpiresAt })
        )
      );
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
    // expand = cấp thêm role CTV scoped (approach a): POST /identity/users/{userId}/roles mỗi scope.
    // permissions[] là metadata invite; role CTV quyết định quyền thực (không grant permission lẻ).
    mutationFn: async ({ memberId, scopes, expiresAt }) => {
      await Promise.all(
        scopes.map((s) =>
          coreClient.post(`/identity/users/${memberId}/roles`, {
            roleCode: "CTV",
            scopeType: s.scopeType,
            scopeId: s.scopeId,
            expiresAt,
          })
        )
      );
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
    // revoke = xoá từng role grant: DELETE /identity/users/{userId}/roles/{grantId}.
    mutationFn: async ({ memberId, grantIds }) => {
      await Promise.all(
        grantIds.map((gid) => coreClient.delete(`/identity/users/${memberId}/roles/${gid}`))
      );
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

interface RbacAuditGql {
  id: string;
  actorId: string | null;
  action: string;
  detail: string | null;
  occurredAt: string;
}

export function useGrantHistory(memberId: string | undefined, params: { page?: number; pageSize?: number } = {}) {
  return useQuery<PaginatedResponse<GrantHistoryEntry>, Error>({
    queryKey: queryKeys.history(memberId ?? "", params as Record<string, unknown>),
    queryFn: async () => {
      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 10;
      const data = await graphqlRequest<{
        rbacUserAudit: { items: RbacAuditGql[]; total: number; page: number; size: number };
      }>(RBAC_USER_AUDIT_QUERY, { userId: memberId, page: { page: Math.max(0, page - 1), size: pageSize } });
      const items: GrantHistoryEntry[] = (data.rbacUserAudit.items ?? []).map((e) => ({
        id: e.id,
        action: mapAuditAction(e.action),
        actorName: e.actorId ?? "—",
        detail: e.detail ?? "",
        at: e.occurredAt,
      }));
      return { items, total: data.rbacUserAudit.total, page, pageSize };
    },
    enabled: !!memberId,
  });
}
