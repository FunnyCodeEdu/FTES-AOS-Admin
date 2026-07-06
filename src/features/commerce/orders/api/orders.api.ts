import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../../shared/api/client";
import { graphqlRequest } from "../../../../shared/api/graphql";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import type { Order, PaginatedResponse } from "../../shared/types";
import { ordersKeys } from "./orders.keys";

const MARKETPLACE_ORDERS_QUERY = `query MarketplaceOrders($page: Int, $pageSize: Int, $search: String, $status: String, $userId: String, $dateFrom: String, $dateTo: String, $amountMin: Float, $amountMax: Float, $sortBy: String, $sortOrder: String) {
  marketplaceOrders(page: $page, pageSize: $pageSize, search: $search, status: $status, userId: $userId, dateFrom: $dateFrom, dateTo: $dateTo, amountMin: $amountMin, amountMax: $amountMax, sortBy: $sortBy, sortOrder: $sortOrder) {
    items {
      id
      code
      buyerEmail
      buyerName
      status
      totalAmount
      paidAmount
      currency
      items { id productName productType quantity unitPrice total }
      paymentTimeline { event occurredAt note actorName }
      createdAt
      updatedAt
    }
    total
    page
    pageSize
  }
}`;

const MARKETPLACE_ORDER_QUERY = `query MarketplaceOrder($id: ID!) {
  marketplaceOrder(id: $id) {
    id
    buyerId
    productId
    amount
    status
    createdAt
  }
}`;

const mockOrders: Order[] = [
  {
    id: "ord-1",
    code: "ORD-20260704-001",
    buyerEmail: "learner@example.com",
    buyerName: "Nguyễn Văn A",
    status: "pending_payment",
    totalAmount: 1_500_000,
    paidAmount: 0,
    currency: "VND",
    items: [
      { id: "it-1", productName: "Khoá học Toán 12", productType: "course_unlock", quantity: 1, unitPrice: 1_500_000, total: 1_500_000 },
    ],
    paymentTimeline: [
      { event: "created", occurredAt: "2026-07-04T09:00:00Z", actorName: "Hệ thống" },
    ],
    createdAt: "2026-07-04T09:00:00Z",
    updatedAt: "2026-07-04T09:00:00Z",
  },
  {
    id: "ord-2",
    code: "ORD-20260703-102",
    buyerEmail: "user2@example.com",
    buyerName: "Trần Thị B",
    status: "completed",
    totalAmount: 2_000_000,
    paidAmount: 2_000_000,
    currency: "VND",
    items: [
      { id: "it-2", productName: "Premium 1 tháng", productType: "premium", quantity: 1, unitPrice: 2_000_000, total: 2_000_000 },
    ],
    paymentTimeline: [
      { event: "created", occurredAt: "2026-07-03T08:00:00Z", actorName: "Hệ thống" },
      { event: "webhook_received", occurredAt: "2026-07-03T08:05:00Z", note: "VietQR TXN-12345" },
      { event: "matched", occurredAt: "2026-07-03T08:06:00Z" },
      { event: "completed", occurredAt: "2026-07-03T08:06:30Z" },
    ],
    createdAt: "2026-07-03T08:00:00Z",
    updatedAt: "2026-07-03T08:06:30Z",
  },
];

function findOrder(id: string | undefined): Order | undefined {
  return mockOrders.find((o) => o.id === id);
}

export interface OrdersListParams {
  status?: string;
  userId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  [key: string]: string | number | undefined;
}

const MOCK_ENABLED_ORDERS = false;
const MOCK_ENABLED_ORDER_DETAIL = false;

export function useOrders(params: OrdersListParams = {}) {
  return useQuery<PaginatedResponse<Order>, Error>({
    queryKey: ordersKeys.list(params),
    queryFn: async () => {
      if (MOCK_ENABLED_ORDERS) {
        void apiClient;
        let items = [...mockOrders];
        if (params.status) items = items.filter((o) => o.status === params.status);
        if (params.userId) items = items.filter((o) => o.buyerEmail.includes(params.userId ?? ""));
        if (params.search) {
          const q = params.search.toLowerCase();
          items = items.filter(
            (o) => o.code.toLowerCase().includes(q) || o.buyerEmail.toLowerCase().includes(q)
          );
        }
        const page = params.page ?? 1;
        const pageSize = params.pageSize ?? 10;
        const start = (page - 1) * pageSize;
        return {
          items: items.slice(start, start + pageSize),
          total: items.length,
          page,
          pageSize,
        };
      }
      return graphqlRequest<{ marketplaceOrders: PaginatedResponse<Order> }>(
        MARKETPLACE_ORDERS_QUERY,
        {
          page: params.page,
          pageSize: params.pageSize,
          search: params.search,
          status: params.status,
          userId: params.userId,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
          amountMin: params.amountMin,
          amountMax: params.amountMax,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
        }
      ).then((r) => r.marketplaceOrders);
    },
  });
}

export function useOrder(id: string | undefined) {
  return useQuery<Order, Error>({
    queryKey: ordersKeys.detail(id),
    queryFn: async () => {
      if (MOCK_ENABLED_ORDER_DETAIL) {
        const order = findOrder(id);
        if (!order) throw new Error("Order not found");
        return order;
      }
      const data = await graphqlRequest<{ marketplaceOrder: { id: string; buyerId?: string; productId?: string; amount: number; status: string; createdAt: string } }>(MARKETPLACE_ORDER_QUERY, { id });
      const item = data.marketplaceOrder;
      return {
        id: item.id,
        code: item.id,
        buyerEmail: item.buyerId ?? "",
        status: item.status as Order["status"],
        totalAmount: item.amount,
        paidAmount: 0,
        currency: "VND",
        items: [],
        paymentTimeline: [],
        createdAt: item.createdAt,
        updatedAt: item.createdAt,
      };
    },
    enabled: !!id,
  });
}

export function useRecheckPayment() {
  const qc = useQueryClient();
  return useMutation<Order, Error, string>({
    mutationFn: async (id) => {
      // MOCK: replace with apiClient.post(`/orders/${id}/recheck-payment`) when BE ready
      void apiClient;
      const order = findOrder(id);
      if (!order) throw new Error("Order not found");
      order.paymentTimeline.push({
        event: "webhook_received",
        occurredAt: new Date().toISOString(),
        note: "Manual recheck simulated",
        actorName: "Admin",
      });
      return order;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ordersKeys.detail(id) });
    },
  });
}

export function useCompleteOrder() {
  const qc = useQueryClient();
  return useMutation<Order, Error, { id: string; reason: string }>({
    mutationFn: async ({ id, reason }) => {
      const res = await apiClient.post(`/orders/${id}/complete`, { reason });
      return res.data as Order;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ordersKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ordersKeys.list({}) });
    },
    onError: handleAdminMutationError,
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation<Order, Error, { id: string; reason: string }>({
    mutationFn: async ({ id, reason }) => {
      const res = await apiClient.post(`/orders/${id}/cancel`, { reason });
      return res.data as Order;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ordersKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ordersKeys.list({}) });
    },
    onError: handleAdminMutationError,
  });
}
