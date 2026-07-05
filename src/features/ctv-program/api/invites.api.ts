import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import { useMe } from "../../auth/api";
import type { CtvInvite, PaginatedResponse } from "../shared/types";

const queryKeys = {
  invites: (params: Record<string, unknown>) => ["ctv", "invites", params] as const,
  invite: (id: string) => ["ctv", "invite", id] as const,
};

let mockInvites: CtvInvite[] = [
  {
    id: "inv-1",
    email: "ctv@example.com",
    scopes: [{ scopeType: "GROUP", scopeId: "g-1", scopeName: "Học Toán 12" }],
    permissions: ["community.report.view", "community.report.resolve"],
    grantExpiresAt: "2026-12-31T00:00:00Z",
    note: "CTV quản group Toán 12",
    status: "pending",
    invitedBy: "u-admin",
    invitedByName: "Admin A",
    createdAt: "2026-07-01T00:00:00Z",
    expiresAt: "2026-07-15T00:00:00Z",
  },
];

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
      void apiClient;
      let items = [...mockInvites];
      if (params.status) items = items.filter((i) => i.status === params.status);
      if (params.search) {
        const q = params.search.toLowerCase();
        items = items.filter((i) => i.email.toLowerCase().includes(q));
      }
      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 10;
      const start = (page - 1) * pageSize;
      return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
    },
  });
}

export function useInvite(id: string | undefined) {
  return useQuery<CtvInvite, Error>({
    queryKey: queryKeys.invite(id ?? ""),
    queryFn: async () => {
      void apiClient;
      const item = mockInvites.find((i) => i.id === id);
      if (!item) throw new Error("Invite not found");
      return { ...item, inviteUrl: `https://app.example.com/ctv/onboarding/${id}` };
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
  const { data: me } = useMe();
  return useMutation<CtvInvite, Error, CreateInviteInput>({
    mutationFn: async (input) => {
      void apiClient;
      const existing = mockInvites.find((i) => i.email === input.email && i.status === "pending");
      if (existing) {
        throw new Error(`DUPLICATE_PENDING:${existing.id}`);
      }
      const invite: CtvInvite = {
        id: `inv-${Date.now()}`,
        ...input,
        status: "pending",
        invitedBy: me?.user.id ?? "admin",
        invitedByName: me?.user.fullName ?? "Admin",
        createdAt: new Date().toISOString(),
        expiresAt: input.grantExpiresAt,
      };
      mockInvites.unshift(invite);
      return { ...invite, inviteUrl: `https://app.example.com/ctv/onboarding/${invite.id}` };
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
      void apiClient;
      void reason;
      const item = mockInvites.find((i) => i.id === id);
      if (!item) throw new Error("Invite not found");
      if (item.status !== "pending") throw new Error("Chỉ có thể thu hồi lời mời pending");
      item.status = "revoked";
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
      void apiClient;
      const item = mockInvites.find((i) => i.id === id);
      if (!item) throw new Error("Invite not found");
      if (item.status !== "pending") throw new Error("Chỉ có thể gửi lại lời mời pending");
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["ctv", "invites"] });
      qc.invalidateQueries({ queryKey: ["ctv", "invite", id] });
    },
  });
}
