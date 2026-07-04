import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../../shared/api/client";
import type { PaginatedResponse, Refund, RefundStatus } from "../../shared/types";
import { refundsKeys } from "./refunds.keys";
import { ordersKeys } from "../../orders/api/orders.keys";

const mockRefunds: Refund[] = [
  {
    id: "ref-1",
    orderId: "ord-2",
    orderCode: "ORD-20260703-102",
    amount: 500_000,
    currency: "VND",
    reason: "Khách đổi ý",
    status: "requested",
    createdBy: "admin-a",
    createdByName: "Admin A",
    timeline: [
      { step: "requested", actorId: "admin-a", actorName: "Admin A", occurredAt: "2026-07-04T10:00:00Z", reason: "Khách đổi ý" },
    ],
    createdAt: "2026-07-04T10:00:00Z",
    updatedAt: "2026-07-04T10:00:00Z",
  },
];

function findRefund(id: string | undefined): Refund | undefined {
  return mockRefunds.find((r) => r.id === id);
}

export interface RefundsListParams {
  status?: RefundStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  [key: string]: string | number | RefundStatus | undefined;
}

export function useRefunds(params: RefundsListParams = {}) {
  return useQuery<PaginatedResponse<Refund>, Error>({
    queryKey: refundsKeys.list(params),
    queryFn: async () => {
      // MOCK: replace with apiClient.get("/refunds", { params }) when BE ready
      void apiClient;
      let items = [...mockRefunds];
      if (params.status) items = items.filter((r) => r.status === params.status);
      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 10;
      const start = (page - 1) * pageSize;
      return {
        items: items.slice(start, start + pageSize),
        total: items.length,
        page,
        pageSize,
      };
    },
  });
}

export function useRefund(id: string | undefined) {
  return useQuery<Refund, Error>({
    queryKey: refundsKeys.detail(id),
    queryFn: async () => {
      // MOCK: replace with apiClient.get(`/refunds/${id}`) when BE ready
      void apiClient;
      const refund = findRefund(id);
      if (!refund) throw new Error("Refund not found");
      return refund;
    },
    enabled: !!id,
  });
}

export function useCreateRefundRequest() {
  const qc = useQueryClient();
  return useMutation<Refund, Error, { orderId: string; amount: number; reason: string }>({
    mutationFn: async (values) => {
      // MOCK: replace with apiClient.post(`/orders/${values.orderId}/refund-requests`, values) when BE ready
      void apiClient;
      const next: Refund = {
        id: `ref-${Date.now()}`,
        orderId: values.orderId,
        orderCode: values.orderId,
        amount: values.amount,
        currency: "VND",
        reason: values.reason,
        status: "requested",
        createdBy: "current-user",
        createdByName: "Current User",
        timeline: [
          {
            step: "requested",
            actorId: "current-user",
            actorName: "Current User",
            occurredAt: new Date().toISOString(),
            reason: values.reason,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockRefunds.push(next);
      return next;
    },
    onSuccess: (_, values) => {
      qc.invalidateQueries({ queryKey: refundsKeys.list({}) });
      qc.invalidateQueries({ queryKey: ordersKeys.detail(values.orderId) });
    },
  });
}

export function useApproveRefund() {
  const qc = useQueryClient();
  return useMutation<Refund, Error, { id: string; note?: string }>({
    mutationFn: async ({ id, note }) => {
      // MOCK: replace with apiClient.post(`/refunds/${id}/approve`, { note }) when BE ready
      void apiClient;
      const refund = findRefund(id);
      if (!refund) throw new Error("Refund not found");
      if (refund.status !== "requested") throw new Error("409: Refund is not in requested status");
      refund.status = "approved";
      refund.approvedBy = "current-approver";
      refund.approvedByName = "Current Approver";
      refund.timeline.push({
        step: "approved",
        actorId: "current-approver",
        actorName: "Current Approver",
        occurredAt: new Date().toISOString(),
        note,
      });
      return refund;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: refundsKeys.detail(id) });
      qc.invalidateQueries({ queryKey: refundsKeys.list({}) });
    },
  });
}

export function useRejectRefund() {
  const qc = useQueryClient();
  return useMutation<Refund, Error, { id: string; reason: string }>({
    mutationFn: async ({ id, reason }) => {
      // MOCK: replace with apiClient.post(`/refunds/${id}/reject`, { reason }) when BE ready
      void apiClient;
      const refund = findRefund(id);
      if (!refund) throw new Error("Refund not found");
      if (refund.status !== "requested") throw new Error("409: Refund is not in requested status");
      refund.status = "rejected";
      refund.timeline.push({
        step: "rejected",
        actorId: "current-approver",
        actorName: "Current Approver",
        occurredAt: new Date().toISOString(),
        reason,
      });
      return refund;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: refundsKeys.detail(id) });
      qc.invalidateQueries({ queryKey: refundsKeys.list({}) });
    },
  });
}

export function useExecuteRefund() {
  const qc = useQueryClient();
  return useMutation<Refund, Error, { id: string; channel: "bank" | "wallet" }>({
    mutationFn: async ({ id, channel }) => {
      // MOCK: replace with apiClient.post(`/refunds/${id}/execute`, { channel }) when BE ready
      void apiClient;
      const refund = findRefund(id);
      if (!refund) throw new Error("Refund not found");
      if (refund.status !== "approved") throw new Error("409: Refund must be approved first");
      refund.status = "executed";
      refund.executedBy = "current-executor";
      refund.executedByName = "Current Executor";
      refund.payoutChannel = channel;
      refund.timeline.push({
        step: "executed",
        actorId: "current-executor",
        actorName: "Current Executor",
        occurredAt: new Date().toISOString(),
        payoutChannel: channel,
      });
      return refund;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: refundsKeys.detail(id) });
      qc.invalidateQueries({ queryKey: refundsKeys.list({}) });
    },
  });
}
