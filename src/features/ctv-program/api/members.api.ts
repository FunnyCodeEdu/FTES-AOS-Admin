import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import type { CtvGrant, CtvMember, GrantHistoryEntry, PaginatedResponse } from "../shared/types";

const queryKeys = {
  members: (params: Record<string, unknown>) => ["ctv", "members", params] as const,
  member: (id: string) => ["ctv", "member", id] as const,
  history: (id: string, params: Record<string, unknown>) => ["ctv", "member", id, "history", params] as const,
};

let mockMembers: CtvMember[] = [
  {
    id: "mem-1",
    userId: "u-ctv-1",
    fullName: "CTV A",
    email: "ctv@example.com",
    scopes: [{ scopeType: "GROUP", scopeId: "g-1", scopeName: "Học Toán 12" }],
    activeGrantCount: 1,
    nearestExpiry: "2026-12-31T00:00:00Z",
    kpi30d: { resourcesProcessed: 12, postsModerated: 34 },
  },
];

let mockGrants: Record<string, CtvGrant[]> = {
  "mem-1": [
    { id: "gr-1", scopeType: "GROUP", scopeId: "g-1", scopeName: "Học Toán 12", permissions: ["community.report.view", "community.report.resolve"], expiresAt: "2026-12-31T00:00:00Z" },
  ],
};

let mockHistory: Record<string, GrantHistoryEntry[]> = {
  "mem-1": [
    { id: "h-1", action: "invite", actorName: "Admin A", detail: "Member CTV A làm CTV group Học Toán 12", at: "2026-07-01T00:00:00Z" },
    { id: "h-2", action: "accept", actorName: "CTV A", detail: "Chấp nhận lời mời member", at: "2026-07-02T00:00:00Z" },
  ],
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
      void apiClient;
      let items = [...mockMembers];
      if (params.search) {
        const q = params.search.toLowerCase();
        items = items.filter((m) => m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
      }
      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 10;
      const start = (page - 1) * pageSize;
      return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
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
      void apiClient;
      const member = mockMembers.find((m) => m.id === id);
      if (!member) throw new Error("Member not found");
      return { member, grants: mockGrants[id ?? ""] ?? [], kpi: member.kpi30d };
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
  return useMutation<CtvGrant[], Error, ExtendGrantsInput>({
    mutationFn: async ({ memberId, grantIds, newExpiresAt, reason }) => {
      void apiClient;
      void reason;
      const grants = mockGrants[memberId] ?? [];
      grantIds.forEach((gid) => {
        const g = grants.find((x) => x.id === gid);
        if (g) g.expiresAt = newExpiresAt;
      });
      return grants;
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
  return useMutation<CtvGrant[], Error, ExpandGrantsInput>({
    mutationFn: async ({ memberId, scopes, permissions, expiresAt, reason }) => {
      void apiClient;
      void reason;
      const grants = mockGrants[memberId] ?? [];
      scopes.forEach((s) => {
        grants.push({
          id: `gr-${Date.now()}-${s.scopeId}`,
          scopeType: s.scopeType,
          scopeId: s.scopeId,
          scopeName: s.scopeName,
          permissions,
          expiresAt,
        });
      });
      mockGrants[memberId] = grants;
      return grants;
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
      void apiClient;
      void reason;
      const grants = mockGrants[memberId] ?? [];
      const stillActive = grantIds.filter((id) => grants.some((g) => g.id === id));
      if (stillActive.length === 0) throw new Error("Các grant đã bị thu hồi trước đó");
      mockGrants[memberId] = grants.filter((g) => !grantIds.includes(g.id));
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
      void apiClient;
      const items = mockHistory[memberId ?? ""] ?? [];
      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 10;
      const start = (page - 1) * pageSize;
      return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
    },
    enabled: !!memberId,
  });
}
