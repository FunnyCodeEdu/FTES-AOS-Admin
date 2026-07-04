import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import type {
  ModLogEntry,
  PaginatedResponse,
  Report,
  ResolveAction,
  WorkflowItem,
  WorkflowStage,
} from "../../community/shared/types";

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

const mockModLog: ModLogEntry[] = [];

export interface ReportsListParams {
  type?: string;
  status?: string;
  severity?: string;
  scopeId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export function useReports(params: ReportsListParams = {}) {
  return useQuery<PaginatedResponse<Report>, Error>({
    queryKey: ["moderation", "reports", params],
    queryFn: async () => {
      // MOCK: replace with apiClient.get("/moderation/reports", { params }) when BE ready
      void apiClient;
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
    },
  });
}

export function useReport(id: string | undefined) {
  return useQuery<Report, Error>({
    queryKey: ["moderation", "reports", id],
    queryFn: async () => {
      // MOCK: replace with apiClient.get(`/moderation/reports/${id}`) when BE ready
      void apiClient;
      const report = mockReports.find((r) => r.id === id);
      if (!report) throw new Error("Report not found");
      return report;
    },
    enabled: !!id,
  });
}

export function useResolveReport() {
  const qc = useQueryClient();
  return useMutation<Report, Error, { id: string; action: ResolveAction; reason: string }>({
    mutationFn: async ({ id, action, reason }) => {
      // MOCK: replace with apiClient.post(`/moderation/reports/${id}/resolve`, { action, reason }) when BE ready
      void apiClient;
      const report = mockReports.find((r) => r.id === id);
      if (!report) throw new Error("Report not found");
      if (report.status !== "pending") throw new Error("409: Report already handled");
      report.status = action === "approve" ? "resolved" : action === "reject" ? "rejected" : "resolved";
      report.history.push({
        action,
        actorId: "current-user",
        actorName: "Current User",
        reason,
        occurredAt: new Date().toISOString(),
      });
      mockModLog.push({
        id: `log-${Date.now()}`,
        actorId: "current-user",
        actorName: "Current User",
        action,
        targetType: report.targetType,
        targetId: report.targetId,
        targetTitle: report.targetTitle,
        reason,
        createdAt: new Date().toISOString(),
      });
      return report;
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
      // MOCK: replace with apiClient.post(`/moderation/reports/${id}/escalate`, { reason }) when BE ready
      void apiClient;
      const report = mockReports.find((r) => r.id === id);
      if (!report) throw new Error("Report not found");
      report.status = "escalated";
      report.history.push({
        action: "escalate",
        actorId: "current-user",
        actorName: "Current User",
        reason,
        occurredAt: new Date().toISOString(),
      });
      return report;
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

export function useWorkflowItems(params: WorkflowListParams = {}) {
  return useQuery<PaginatedResponse<WorkflowItem>, Error>({
    queryKey: ["moderation", "workflow", params],
    queryFn: async () => {
      // MOCK: replace with apiClient.get("/moderation/workflow/items", { params }) when BE ready
      void apiClient;
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
    queryFn: async () => {
      // MOCK: replace with apiClient.get("/moderation/log", { params }) when BE ready
      void apiClient;
      let items = [...mockModLog];
      if (params.actorId) items = items.filter((e) => e.actorId === params.actorId);
      if (params.action) items = items.filter((e) => e.action === params.action);
      if (params.targetType) items = items.filter((e) => e.targetType === params.targetType);
      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 10;
      const start = (page - 1) * pageSize;
      return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
    },
  });
}
