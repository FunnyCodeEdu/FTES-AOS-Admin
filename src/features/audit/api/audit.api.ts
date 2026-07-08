import { useQuery } from "@tanstack/react-query";
import { graphqlRequest } from "../../../shared/api/graphql";
import type {
  AuditEntry,
  AuditEntryDetail,
  AuditLogParams,
  PaginatedResponse,
  SecurityEvent,
  SecurityEventParams,
} from "../shared/types";

// Audit and security logs are immutable: this module defines only GET queries.
// No mutations, no POST/PUT/DELETE.
//
// Wired to the BE GraphQL admin read gateway (no mock):
// - Audit log LIST      → query adminAuditLogs(filter, page)   [guard admin.audit.read]
// - Audit log DETAIL    → derived from the list row (no by-id endpoint on BE); see AuditLogPage.
// - Security event LIST → query adminUserSecurityLog(userId, page) [guard admin.user.security-log]
//   BE only exposes security log PER USER, so this list requires a userId filter.

const ADMIN_AUDIT_LOGS_QUERY = `query AdminAuditLogs($filter: AdminAuditLogFilter, $page: PageInput) {
  adminAuditLogs(filter: $filter, page: $page) {
    items {
      id
      actorId
      action
      resourceType
      resourceId
      occurredAt
    }
    total
    page
    size
  }
}`;

const ADMIN_USER_SECURITY_LOG_QUERY = `query AdminUserSecurityLog($userId: ID!, $page: PageInput) {
  adminUserSecurityLog(userId: $userId, page: $page) {
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

export const auditKeys = {
  all: ["audit"] as const,
  logs: (params: AuditLogParams) => [...auditKeys.all, "logs", params] as const,
  log: (id: string | undefined) => (id ? ([...auditKeys.all, "logs", id] as const) : auditKeys.all),
  security: (params: SecurityEventParams) => [...auditKeys.all, "security", params] as const,
};

export function useAuditLogs(params: AuditLogParams) {
  return useQuery<PaginatedResponse<AuditEntry>, Error>({
    queryKey: auditKeys.logs(params),
    queryFn: () =>
      graphqlRequest<{
        adminAuditLogs: {
          items: Array<{
            id: string;
            actorId?: string;
            action: string;
            resourceType?: string;
            resourceId?: string;
            occurredAt: string;
          }>;
          total: number;
          page: number;
          size: number;
        };
      }>(ADMIN_AUDIT_LOGS_QUERY, {
        filter: {
          ...(params.actorId ? { actorId: params.actorId } : {}),
          ...(params.action ? { action: params.action } : {}),
          ...(params.domain ? { resourceType: params.domain } : {}),
          ...(params.from ? { from: params.from } : {}),
          ...(params.to ? { to: params.to } : {}),
        },
        page: { page: Math.max(0, params.page - 1), size: params.pageSize },
      }).then((r) => ({
        items: r.adminAuditLogs.items.map((item) => ({
          id: item.id,
          actor: {
            // BE audit log only carries actorId (no name/email). Show the id as label.
            id: item.actorId ?? "",
            fullName: item.actorId ?? "—",
            email: undefined,
          },
          action: item.action,
          domain: item.resourceType ?? "",
          targetType: item.resourceType ?? "",
          targetId: item.resourceId ?? "",
          createdAt: item.occurredAt,
        })),
        total: r.adminAuditLogs.total,
        page: (r.adminAuditLogs.page ?? 0) + 1,
        pageSize: r.adminAuditLogs.size,
      })),
    staleTime: 60 * 1000,
  });
}

/**
 * Build the audit detail view from a list row. BE has no audit detail-by-id endpoint
 * (the by-id GraphQL is bugged 401 and no REST `/admin/audit/logs/{id}` exists), and the
 * real AdminAuditLog shape carries no before/after/metadata/ip — those are left null.
 */
export function auditEntryToDetail(entry: AuditEntry): AuditEntryDetail {
  return {
    ...entry,
    before: null,
    after: null,
    metadata: null,
    ip: null,
  };
}

/** Normalized security event type → severity (BE view has no severity field). */
function deriveSeverity(type: string): SecurityEvent["severity"] {
  switch (type.toUpperCase()) {
    case "ANOMALY":
    case "LOCK":
      return "high";
    case "MFA":
    case "SESSION":
    case "DEVICE":
      return "medium";
    default:
      return "low";
  }
}

/** Parse the free-form `detail` payload into a metadata object when possible. */
function parseDetail(detail: string | null | undefined): Record<string, unknown> | undefined {
  if (!detail) return undefined;
  try {
    const parsed = JSON.parse(detail);
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
  } catch {
    /* not JSON */
  }
  return { detail };
}

export function useSecurityEvents(params: SecurityEventParams) {
  return useQuery<PaginatedResponse<SecurityEvent>, Error>({
    queryKey: auditKeys.security(params),
    // BE only exposes security log per user → a userId is required.
    enabled: !!params.userId,
    queryFn: () =>
      graphqlRequest<{
        adminUserSecurityLog: {
          items: Array<{
            id: string;
            type: string;
            timestamp: string;
            ip?: string;
            userAgent?: string;
            detail?: string;
          }>;
          total: number;
          page: number;
          size: number;
        };
      }>(ADMIN_USER_SECURITY_LOG_QUERY, {
        userId: params.userId,
        page: { page: Math.max(0, params.page - 1), size: params.pageSize },
      }).then((r) => ({
        items: r.adminUserSecurityLog.items.map((e) => ({
          id: e.id,
          type: e.type as SecurityEvent["type"],
          timestamp: e.timestamp,
          userId: params.userId ?? "",
          userName: params.userId ?? "",
          ip: e.ip ?? "",
          device: e.userAgent ?? "",
          severity: deriveSeverity(e.type),
          metadata: parseDetail(e.detail),
        })),
        total: r.adminUserSecurityLog.total,
        page: (r.adminUserSecurityLog.page ?? 0) + 1,
        pageSize: r.adminUserSecurityLog.size,
      })),
    staleTime: 60 * 1000,
  });
}
