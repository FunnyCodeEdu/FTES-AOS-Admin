import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, coreClient } from "../../../../shared/api/client";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import type { PaginatedResponse, Refund, RefundStatus } from "../../shared/types";
import { refundsKeys } from "./refunds.keys";
import { ordersKeys } from "../../orders/api/orders.keys";

// BE: GET /api/v1/commerce/admin/refund-requests → PageView<RefundRequestView>
// (perm commerce.refund.approve). RefundRequestView = {id, orderId, status, reason, amount, channel}.
interface RefundRequestView {
  id: string;
  orderId: string;
  status: string; // REQUESTED | APPROVED | REJECTED | COMPLETED
  reason: string;
  amount: number;
  channel: string; // COIN | BANK_MANUAL
}
interface BEPage<T> {
  items: T[];
  page: number;
  totalElements: number;
}

function mapStatus(be: string): RefundStatus {
  switch (be) {
    case "APPROVED":
      return "approved";
    case "REJECTED":
      return "rejected";
    case "COMPLETED":
      return "executed";
    default:
      return "requested";
  }
}

function mapRefund(v: RefundRequestView): Refund {
  return {
    id: v.id,
    orderId: v.orderId,
    orderCode: v.orderId,
    amount: v.amount,
    currency: "VND",
    reason: v.reason,
    status: mapStatus(v.status),
    // BE RefundRequestView không trả actor/timeline; RefundDetailPage cần các trường này.
    createdBy: "",
    createdByName: "",
    payoutChannel: v.channel === "COIN" ? "wallet" : "bank",
    timeline: [],
    createdAt: "",
    updatedAt: "",
  };
}

// Mock giữ cho các luồng BE chưa có endpoint (detail by-id, create, execute).
const mockRefunds: Refund[] = [];
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
      const res = await coreClient.get("/commerce/admin/refund-requests", {
        params: {
          page: Math.max(0, (params.page ?? 1) - 1),
          size: params.pageSize ?? 10,
        },
      });
      const data = res.data as BEPage<RefundRequestView>;
      let items = data.items.map(mapRefund);
      // BE queue chưa nhận filter status → lọc client-side để giữ UX filter.
      if (params.status) items = items.filter((r) => r.status === params.status);
      return {
        items,
        total: data.totalElements,
        page: (params.page ?? 1),
        pageSize: params.pageSize ?? 10,
      };
    },
  });
}

export function useRefund(id: string | undefined) {
  return useQuery<Refund, Error>({
    queryKey: refundsKeys.detail(id),
    queryFn: async () => {
      const res = await coreClient.get(`/commerce/admin/refund-requests/${id}`);
      return mapRefund(res.data as RefundRequestView);
    },
    enabled: !!id,
  });
}

export function useCreateRefundRequest() {
  const qc = useQueryClient();
  return useMutation<Refund, Error, { orderId: string; amount: number; reason: string }>({
    mutationFn: async (values) => {
      // TODO(BE): admin chưa có POST tạo refund-request; RefundCreateRequest hiện ở luồng user. Mock.
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
        payoutChannel: "bank",
        timeline: [],
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
    mutationFn: async ({ id }) => {
      // BE: POST /commerce/admin/refund-requests/{id}/approve (perm commerce.refund.approve).
      const res = await coreClient.post(`/commerce/admin/refund-requests/${id}/approve`, {});
      return mapRefund(res.data as RefundRequestView);
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: refundsKeys.detail(id) });
      qc.invalidateQueries({ queryKey: refundsKeys.list({}) });
    },
    onError: handleAdminMutationError,
  });
}

export function useRejectRefund() {
  const qc = useQueryClient();
  return useMutation<Refund, Error, { id: string; reason: string }>({
    mutationFn: async ({ id, reason }) => {
      // BE: POST /commerce/admin/refund-requests/{id}/reject { note } (perm commerce.refund.approve).
      const res = await coreClient.post(`/commerce/admin/refund-requests/${id}/reject`, { note: reason });
      return mapRefund(res.data as RefundRequestView);
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: refundsKeys.detail(id) });
      qc.invalidateQueries({ queryKey: refundsKeys.list({}) });
    },
    onError: handleAdminMutationError,
  });
}

export function useExecuteRefund() {
  const qc = useQueryClient();
  return useMutation<Refund, Error, { id: string; channel: "bank" | "wallet" }>({
    mutationFn: async ({ id, channel }) => {
      // TODO(BE): không có endpoint execute riêng (approve đã kích hoàn tiền). Mock.
      void apiClient;
      const refund = findRefund(id);
      if (!refund) throw new Error("Refund not found");
      refund.status = "executed";
      refund.payoutChannel = channel;
      return refund;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: refundsKeys.detail(id) });
      qc.invalidateQueries({ queryKey: refundsKeys.list({}) });
    },
  });
}
