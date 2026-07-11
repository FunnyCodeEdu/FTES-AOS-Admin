import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import { graphqlRequest } from "../../../shared/api/graphql";
import type {
  ModLogEntry,
  PaginatedResponse,
  Report,
  ResolveAction,
  WorkflowItem,
  WorkflowStage,
} from "../../community/shared/types";

const COMMUNITY_REPORTS_QUERY = `query CommunityReports($filter: AdminCommunityReportFilter, $page: PageInput) {
  communityReports(filter: $filter, page: $page) {
    items {
      id
      reporterId
      targetType
      targetId
      reasonCode
      status
      createdAt
    }
    total
    page
    size
  }
}`;

const WORKFLOW_QUEUES_QUERY = `query WorkflowQueues {
  workflowQueues {
    queueKey
    name
    pending
    slaBreached
  }
}`;

// Moderation log = audit log THẬT (adminAuditLogs, guard admin.audit.read). BE không có REST /moderation/log.
const ADMIN_AUDIT_LOGS_QUERY = `query AdminAuditLogs($filter: AdminAuditLogFilter, $page: PageInput) {
  adminAuditLogs(filter: $filter, page: $page) {
    items { id actorId action resourceType resourceId occurredAt }
    total
    page
    size
  }
}`;

const mockReports: Report[] = [
  {
    id: "rep-1",
    targetType: "post",
    targetId: "post-1",
    targetTitle: "Bài viết spam",
    targetSnapshot: "Nội dung quảng cáo không liên quan...",
    groupId: "g-1",
    groupName: "Học Toán 12",
    status: "pending",
    severity: "high",
    reporters: [{ userId: "u-2", userName: "User B", reason: "Spam", reportedAt: "2026-07-04T10:00:00Z" }],
    history: [],
    createdAt: "2026-07-04T10:00:00Z",
    updatedAt: "2026-07-04T10:00:00Z",
  },
];

const mockWorkflowItems: WorkflowItem[] = [
  {
    id: "wf-1",
    title: "Bài hướng dẫn ôn thi",
    contentType: "post",
    authorId: "u-3",
    authorName: "User C",
    stage: "mod_review",
    transitions: [],
    createdAt: "2026-07-03T08:00:00Z",
  },
];

export interface ReportsListParams {
  type?: string;
  status?: string;
  severity?: string;
  scopeId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

const MOCK_ENABLED_REPORTS = false;

export function useReports(params: ReportsListParams = {}) {
  return useQuery<PaginatedResponse<Report>, Error>({
    queryKey: ["moderation", "reports", params],
    queryFn: async () => {
      if (MOCK_ENABLED_REPORTS) {
        let items = [...mockReports];
        if (params.type) items = items.filter((r) => r.targetType === params.type);
        if (params.status) items = items.filter((r) => r.status === params.status);
        if (params.severity) items = items.filter((r) => r.severity === params.severity);
        if (params.scopeId) items = items.filter((r) => r.groupId === params.scopeId);
        if (params.search) {
          const q = params.search.toLowerCase();
          items = items.filter((r) => r.targetTitle.toLowerCase().includes(q));
        }
        const page = params.page ?? 1;
        const pageSize = params.pageSize ?? 10;
        const start = (page - 1) * pageSize;
        return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
      }
      return graphqlRequest<{
        communityReports: {
          items: Array<{
            id: string;
            reporterId: string;
            targetType: string;
            targetId: string;
            reasonCode: string;
            status: string;
            createdAt?: string;
          }>;
          total: number;
          page: number;
          size: number;
        };
      }>(COMMUNITY_REPORTS_QUERY, {
        filter: {
          ...(params.status ? { status: params.status } : {}),
          ...(params.type ? { targetType: params.type } : {}),
        },
        page: { page: Math.max(0, (params.page ?? 1) - 1), size: params.pageSize ?? 10 },
      }).then((r) => ({
        items: r.communityReports.items.map((item) => ({
          id: item.id,
          targetType: item.targetType as Report["targetType"],
          targetId: item.targetId,
          targetTitle: "",
          targetSnapshot: "",
          status: item.status as Report["status"],
          severity: "low" as Report["severity"],
          reporters: [
            {
              userId: item.reporterId,
              userName: "",
              reason: item.reasonCode,
              reportedAt: item.createdAt ?? "",
            },
          ],
          history: [],
          createdAt: item.createdAt ?? "",
          updatedAt: item.createdAt ?? "",
        })),
        total: r.communityReports.total,
        page: (r.communityReports.page ?? 0) + 1,
        pageSize: r.communityReports.size,
      }));
    },
  });
}

const COMMUNITY_REPORT_QUERY = `query CommunityReport($id: ID!) {
  communityReport(id: $id) {
    id targetType targetId targetTitle targetSnapshot status severity
    reporters { userId userName reason reportedAt }
    history { action actorId actorName reason occurredAt }
    createdAt updatedAt
  }
}`;

export function useReport(id: string | undefined) {
  return useQuery<Report, Error>({
    queryKey: ["moderation", "reports", id],
    queryFn: () =>
      graphqlRequest<{
        communityReport: {
          id: string;
          targetType: string;
          targetId: string;
          targetTitle?: string;
          targetSnapshot?: string;
          status: string;
          severity?: string;
          reporters: Array<{ userId: string; userName?: string; reason: string; reportedAt: string }>;
          history: Array<{ action: string; actorId: string; actorName?: string; reason?: string; occurredAt: string }>;
          createdAt?: string;
          updatedAt?: string;
        } | null;
      }>(COMMUNITY_REPORT_QUERY, { id }).then((r) => {
        const c = r.communityReport;
        if (!c) throw new Error("Report not found");
        return {
          id: c.id,
          targetType: c.targetType as Report["targetType"],
          targetId: c.targetId,
          targetTitle: c.targetTitle ?? "",
          targetSnapshot: c.targetSnapshot ?? "",
          status: c.status as Report["status"],
          severity: (c.severity ?? "low") as Report["severity"],
          reporters: c.reporters.map((rp) => ({
            userId: rp.userId,
            userName: rp.userName ?? "",
            reason: rp.reason,
            reportedAt: rp.reportedAt,
          })),
          history: c.history.map((h) => ({
            action: h.action,
            actorId: h.actorId,
            actorName: h.actorName ?? "",
            reason: h.reason,
            occurredAt: h.occurredAt,
          })),
          createdAt: c.createdAt ?? "",
          updatedAt: c.updatedAt ?? "",
        };
      }),
    enabled: !!id,
  });
}

export function useResolveReport() {
  const qc = useQueryClient();
  return useMutation<Report, Error, { id: string; action: ResolveAction; reason: string }>({
    mutationFn: async ({ id, action, reason }) => {
      const res = await apiClient.post(`/community/reports/${id}/resolve`, { action, reason });
      return res.data as Report;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["moderation", "reports"] });
      qc.invalidateQueries({ queryKey: ["moderation", "log"] });
    },
  });
}

export function useEscalateReport() {
  const qc = useQueryClient();
  return useMutation<Report, Error, { id: string; reason: string }>({
    mutationFn: async ({ id, reason }) => {
      const res = await apiClient.post(`/community/reports/${id}/escalate`, { reason });
      return res.data as Report;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["moderation", "reports"] });
      qc.invalidateQueries({ queryKey: ["moderation", "log"] });
    },
  });
}

export interface WorkflowListParams {
  stage?: string;
  type?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

const MOCK_ENABLED_WORKFLOW = false;

export function useWorkflowItems(params: WorkflowListParams = {}) {
  return useQuery<PaginatedResponse<WorkflowItem>, Error>({
    queryKey: ["moderation", "workflow", params],
    queryFn: async () => {
      if (MOCK_ENABLED_WORKFLOW) {
        let items = [...mockWorkflowItems];
        if (params.stage) items = items.filter((i) => i.stage === params.stage);
        if (params.type) items = items.filter((i) => i.contentType === params.type);
        if (params.search) {
          const q = params.search.toLowerCase();
          items = items.filter((i) => i.title.toLowerCase().includes(q));
        }
        const page = params.page ?? 1;
        const pageSize = params.pageSize ?? 50;
        const start = (page - 1) * pageSize;
        return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
      }
      const data = await graphqlRequest<{
        workflowQueues: Array<{ queueKey: string; name: string; pending: number; slaBreached: number }>;
      }>(WORKFLOW_QUEUES_QUERY);
      const mapped = data.workflowQueues.map((q) => ({
        id: q.queueKey,
        title: q.name,
        contentType: "",
        authorId: "",
        authorName: "",
        stage: "draft" as WorkflowItem["stage"],
        transitions: [],
        createdAt: new Date().toISOString(),
      }));
      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 50;
      const start = (page - 1) * pageSize;
      return {
        items: mapped.slice(start, start + pageSize),
        total: mapped.length,
        page,
        pageSize,
      };
    },
  });
}

export function useTransitionWorkflowItem() {
  const qc = useQueryClient();
  return useMutation<WorkflowItem, Error, { id: string; toStage: WorkflowStage; note?: string }>({
    mutationFn: async ({ id, toStage, note }) => {
      // MOCK: replace with apiClient.post(`/moderation/workflow/items/${id}/transition`, { toStage, note }) when BE ready
      void apiClient;
      const item = mockWorkflowItems.find((i) => i.id === id);
      if (!item) throw new Error("Workflow item not found");
      item.transitions.push({
        from: item.stage,
        to: toStage,
        actorId: "current-user",
        actorName: "Current User",
        note,
        occurredAt: new Date().toISOString(),
      });
      item.stage = toStage;
      return item;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["moderation", "workflow"] }),
  });
}

export interface ModLogListParams {
  actorId?: string;
  action?: string;
  targetType?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export function useModerationLog(params: ModLogListParams = {}) {
  return useQuery<PaginatedResponse<ModLogEntry>, Error>({
    queryKey: ["moderation", "log", params],
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
          ...(params.targetType ? { resourceType: params.targetType } : {}),
          ...(params.from ? { from: params.from } : {}),
          ...(params.to ? { to: params.to } : {}),
        },
        page: { page: Math.max(0, (params.page ?? 1) - 1), size: params.pageSize ?? 10 },
      }).then((r) => ({
        items: r.adminAuditLogs.items.map((item) => ({
          id: item.id,
          actorId: item.actorId ?? "",
          actorName: item.actorId ?? "—",
          action: item.action,
          targetType: item.resourceType ?? "",
          targetId: item.resourceId ?? "",
          createdAt: item.occurredAt,
        })),
        total: r.adminAuditLogs.total,
        page: (r.adminAuditLogs.page ?? 0) + 1,
        pageSize: r.adminAuditLogs.size,
      })),
  });
}
