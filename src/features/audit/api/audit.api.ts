import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import { graphqlRequest } from "../../../shared/api/graphql";
import type {
  AuditEntry,
  AuditEntryDetail,
  AuditLogParams,
  PaginatedResponse,
  SecurityEvent,
  SecurityEventParams,
  SecurityEventType,
} from "../shared/types";

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

// Audit and security logs are immutable: this module defines only GET queries.
// No mutations, no POST/PUT/DELETE.

const MOCK_ENABLED = true;

function mockAuditLog(params: AuditLogParams): PaginatedResponse<AuditEntry> {
  const total = 24;
  const items = Array.from({ length: Math.min(params.pageSize, total - (params.page - 1) * params.pageSize) }, (_, i) => {
    const idx = (params.page - 1) * params.pageSize + i;
    return {
      id: `audit-${idx}`,
      actor: { id: `user-${idx % 4}`, fullName: `Actor ${idx % 4}`, email: `actor${idx % 4}@ftes.vn` },
      action: ["refund.approve", "order.cancel", "user.lock", "role.update"][idx % 4],
      domain: params.domain ?? ["commerce", "users", "rbac"][idx % 3],
      targetType: ["order", "user", "role"][idx % 3],
      targetId: `target-${idx}`,
      createdAt: new Date(Date.now() - idx * 3600000).toISOString(),
    };
  });
  return { items, total, page: params.page, pageSize: params.pageSize };
}

function mockAuditDetail(id: string): AuditEntryDetail {
  return {
    id,
    actor: { id: "user-1", fullName: "Admin A", email: "admin@ftes.vn" },
    action: "refund.approve",
    domain: "commerce",
    targetType: "order",
    targetId: `order-${id}`,
    createdAt: new Date().toISOString(),
    ip: "203.0.113.10",
    before: { status: "pending", amount: 500000, notes: "" },
    after: { status: "approved", amount: 500000, notes: "Approved by admin" },
    metadata: { source: "web", requestId: `req-${id}` },
  };
}

function mockSecurityEvents(params: SecurityEventParams): PaginatedResponse<SecurityEvent> {
  const total = 18;
  const items = Array.from(
    { length: Math.min(params.pageSize, total - (params.page - 1) * params.pageSize) },
    (_, i) => {
      const idx = (params.page - 1) * params.pageSize + i;
      const type: SecurityEventType =
        params.type ?? (["login_anomaly", "account_lock", "permission_change"] as SecurityEventType[])[idx % 3];
      return {
        id: `sec-${idx}`,
        type,
        timestamp: new Date(Date.now() - idx * 7200000).toISOString(),
        userId: `user-${idx % 5}`,
        userName: `User ${idx % 5}`,
        actorId: type === "permission_change" ? "admin-1" : undefined,
        actorName: type === "permission_change" ? "Super Admin" : undefined,
        ip: `203.0.113.${10 + (idx % 20)}`,
        device: ["Chrome / Windows", "Safari / macOS", "Mobile / iOS"][idx % 3],
        severity: (["low", "medium", "high", "critical"] as const)[idx % 4],
        metadata:
          type === "permission_change"
            ? { before: ["user.view"], after: ["user.view", "user.lock"] }
            : { location: "Hanoi, VN" },
      };
    }
  );
  return { items, total, page: params.page, pageSize: params.pageSize };
}

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
      MOCK_ENABLED
        ? Promise.resolve(mockAuditLog(params))
        : graphqlRequest<{
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
                id: item.actorId ?? "",
                fullName: "",
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

export function useAuditLog(id: string | undefined) {
  return useQuery<AuditEntryDetail, Error>({
    queryKey: auditKeys.log(id),
    queryFn: () =>
      MOCK_ENABLED
        ? Promise.resolve(mockAuditDetail(id ?? ""))
        : apiClient.get(`/audit/logs/${id}`).then((r) => r.data as AuditEntryDetail),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

export function useSecurityEvents(params: SecurityEventParams) {
  return useQuery<PaginatedResponse<SecurityEvent>, Error>({
    queryKey: auditKeys.security(params),
    queryFn: () =>
      MOCK_ENABLED
        ? Promise.resolve(mockSecurityEvents(params))
        : apiClient
            .get("/audit/security-events", { params })
            .then((r) => r.data as PaginatedResponse<SecurityEvent>),
    staleTime: 60 * 1000,
  });
}
