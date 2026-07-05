export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type CtvInviteStatus = "pending" | "accepted" | "expired" | "revoked";

export interface CtvScopeRef {
  scopeType: string;
  scopeId: string;
  scopeName: string;
}

export interface CtvInvite {
  id: string;
  email: string;
  scopes: CtvScopeRef[];
  permissions: string[];
  grantExpiresAt: string;
  note?: string;
  status: CtvInviteStatus;
  invitedBy: string;
  invitedByName: string;
  createdAt: string;
  expiresAt: string;
  inviteUrl?: string;
}

export interface CtvMember {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  scopes: CtvScopeRef[];
  activeGrantCount: number;
  nearestExpiry?: string;
  kpi30d: {
    resourcesProcessed: number;
    postsModerated: number;
  };
}

export interface CtvGrant {
  id: string;
  scopeType: string;
  scopeId: string;
  scopeName: string;
  permissions: string[];
  expiresAt: string;
}

export interface GrantHistoryEntry {
  id: string;
  action: "invite" | "accept" | "extend" | "expand" | "revoke";
  actorName: string;
  detail: string;
  reason?: string;
  at: string;
}

export interface CtvKpiSummary {
  resourcesProcessed: number;
  postsModerated: number;
  contributions: { date: string; count: number }[];
  byScope: { scopeType: string; scopeId: string; scopeName: string; count: number }[];
}

export interface TeamPerformanceMember {
  memberId: string;
  fullName: string;
  email: string;
  resourcesProcessed: number;
  postsModerated: number;
  score: number;
}

export interface GrantablePermission {
  key: string;
  description: string;
  scopeTypes: string[];
}
