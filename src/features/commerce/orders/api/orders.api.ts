import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coreClient } from "../../../../shared/api/client";
import { graphqlRequest, toGraphQLSortOrder } from "../../../../shared/api/graphql";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import type { Order, PaginatedResponse } from "../../shared/types";
import { ordersKeys } from "./orders.keys";

const MARKETPLACE_ORDERS_QUERY = `query MarketplaceOrders($filter: AdminOrderFilter, $page: PageInput) {
  marketplaceOrders(filter: $filter, page: $page) {
    items {
      id
      buyerId
      productId
      amount
      status
      createdAt
    }
    total
    page
    size
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

export function useOrders(params: OrdersListParams = {}) {
  return useQuery<PaginatedResponse<Order>, Error>({
    queryKey: ordersKeys.list(params),
    queryFn: async () => {
      return graphqlRequest<{
        marketplaceOrders: {
          items: Array<{
            id: string;
            buyerId: string;
            productId?: string;
            amount: number;
            status: string;
            createdAt: string;
          }>;
          total: number;
          page: number;
          size: number;
        };
      }>(MARKETPLACE_ORDERS_QUERY, {
        filter: {
          ...(params.search ? { q: params.search } : {}),
          ...(params.status ? { status: params.status } : {}),
          ...(params.userId ? { userId: params.userId } : {}),
          ...(params.dateFrom ? { dateFrom: params.dateFrom } : {}),
          ...(params.dateTo ? { dateTo: params.dateTo } : {}),
          ...(params.amountMin != null ? { amountMin: params.amountMin } : {}),
          ...(params.amountMax != null ? { amountMax: params.amountMax } : {}),
          ...(params.sortBy ? { sortBy: params.sortBy } : {}),
          ...(toGraphQLSortOrder(params.sortOrder)
            ? { sortOrder: toGraphQLSortOrder(params.sortOrder) }
            : {}),
        },
        page: { page: Math.max(0, (params.page ?? 1) - 1), size: params.pageSize ?? 10 },
      }).then((r) => ({
        items: r.marketplaceOrders.items.map((item) => ({
          id: item.id,
          code: item.id,
          buyerEmail: item.buyerId,
          status: item.status as Order["status"],
          totalAmount: item.amount,
          paidAmount: 0,
          currency: "VND",
          items: [],
          paymentTimeline: [],
          createdAt: item.createdAt,
          updatedAt: item.createdAt,
        })),
        total: r.marketplaceOrders.total,
        page: (r.marketplaceOrders.page ?? 0) + 1,
        pageSize: r.marketplaceOrders.size,
      }));
    },
  });
}

export function useOrder(id: string | undefined) {
  return useQuery<Order, Error>({
    queryKey: ordersKeys.detail(id),
    queryFn: async () => {
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
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      // BE: POST /api/v1/commerce/admin/orders/{orderId}/recheck — đối chiếu lại payment
      // theo order (đường webhook lỡ). Response order view mới → chỉ cần invalidate.
      await coreClient.post(`/commerce/admin/orders/${id}/recheck`, {});
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ordersKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ordersKeys.list({}) });
    },
    onError: handleAdminMutationError,
  });
}

// BE KHÔNG có endpoint "đánh dấu hoàn tất" thủ công (chỉ webhook/recheck kích entitlement)
// → useCompleteOrder đã gỡ; nút ở OrderActionPanel disabled kèm tooltip giải thích.

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; reason: string }>({
    mutationFn: async ({ id, reason }) => {
      // BE: POST /api/v1/commerce/admin/orders/{orderId}/cancel (admin, khác luồng user
      // /commerce/orders/{id}/cancel owner-only). reason gửi kèm cho audit.
      await coreClient.post(`/commerce/admin/orders/${id}/cancel`, { reason });
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ordersKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ordersKeys.list({}) });
    },
    onError: handleAdminMutationError,
  });
}
