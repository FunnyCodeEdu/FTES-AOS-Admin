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
      buyerName
      buyerEmail
      productId
      amount
      paidAmount
      discountAmount
      coinApplied
      coinDiscountVnd
      payMethod
      legacy
      payCode
      description
      status
      createdAt
      paidAt
      completedAt
      items { id productId productName productType courseId coursePackageId unitAmount quantity totalAmount fulfillmentStatus }
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
    buyerName
    buyerEmail
    productId
    amount
    paidAmount
    discountAmount
    coinApplied
    coinDiscountVnd
    payMethod
    legacy
    payCode
    description
    status
    createdAt
    paidAt
    completedAt
    items { id productId productName productType courseId coursePackageId unitAmount quantity totalAmount fulfillmentStatus }
    payments { id gateway amount status txnRef bankName transferDescription createdAt confirmedAt }
  }
}`;

export interface AdminOrderDto {
  id: string;
  buyerId: string;
  buyerName?: string;
  buyerEmail?: string;
  productId?: string;
  amount: number;
  paidAmount: number;
  discountAmount: number;
  coinApplied: string;
  coinDiscountVnd: number;
  payMethod?: string;
  legacy: boolean;
  payCode?: string;
  description?: string;
  status: string;
  createdAt: string;
  paidAt?: string;
  completedAt?: string;
  items: Array<{
    id: string;
    productId?: string;
    productName?: string;
    productType?: string;
    courseId?: string;
    coursePackageId?: string;
    unitAmount: number;
    quantity: number;
    totalAmount: number;
    fulfillmentStatus?: string;
  }>;
  payments?: Array<{
    id: string;
    gateway?: string;
    amount: number;
    status?: string;
    txnRef?: string;
    bankName?: string;
    transferDescription?: string;
    createdAt: string;
    confirmedAt?: string;
  }>;
}

export function mapOrder(item: AdminOrderDto): Order {
  const payments = (item.payments ?? []).map((payment) => ({
    id: payment.id,
    gateway: payment.gateway,
    amount: payment.amount,
    status: payment.status,
    transactionCode: payment.txnRef,
    bankName: payment.bankName,
    transferDescription: payment.transferDescription,
    createdAt: payment.createdAt,
    confirmedAt: payment.confirmedAt,
  }));
  const paymentTimeline: Order["paymentTimeline"] = [
    { event: "created", occurredAt: item.createdAt, note: "Đơn hàng được tạo" },
    ...payments.map((payment) => ({
      event: payment.status === "SUCCEEDED"
        ? "matched" as const
        : payment.status === "FAILED"
          ? "failed" as const
          : "webhook_received" as const,
      occurredAt: payment.confirmedAt ?? payment.createdAt,
      note: [
        payment.status === "INITIATED" ? "Đã tạo QR, đang chờ chuyển khoản" : undefined,
        payment.transactionCode ? `Mã GD: ${payment.transactionCode}` : undefined,
        payment.bankName ?? payment.gateway,
        payment.transferDescription,
      ].filter(Boolean).join(" • "),
    })),
  ];
  if (item.completedAt) {
    paymentTimeline.push({ event: "completed", occurredAt: item.completedAt, note: "Hoàn tất đơn hàng" });
  }
  return {
    id: item.id,
    code: item.id,
    buyerId: item.buyerId,
    buyerEmail: item.buyerEmail ?? item.buyerId,
    buyerName: item.buyerName,
    status: item.status as Order["status"],
    totalAmount: item.amount,
    paidAmount: item.paidAmount ?? 0,
    currency: "VND",
    discountAmount: item.discountAmount ?? 0,
    coinApplied: Number(item.coinApplied ?? 0),
    coinDiscountVnd: item.coinDiscountVnd ?? 0,
    payMethod: item.payMethod,
    legacy: item.legacy,
    payCode: item.payCode,
    description: item.description,
    items: (item.items ?? []).map((line) => ({
      id: line.id,
      productId: line.productId,
      productName: line.productName ?? line.courseId ?? "Sản phẩm",
      productType: line.productType ?? "—",
      courseId: line.courseId,
      coursePackageId: line.coursePackageId,
      quantity: line.quantity,
      unitPrice: line.unitAmount,
      total: line.totalAmount,
      fulfillmentStatus: line.fulfillmentStatus,
    })),
    payments,
    paymentTimeline,
    paidAt: item.paidAt,
    completedAt: item.completedAt,
    createdAt: item.createdAt,
    updatedAt: item.completedAt ?? item.paidAt ?? item.createdAt,
  };
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

export function useOrders(params: OrdersListParams = {}) {
  return useQuery<PaginatedResponse<Order>, Error>({
    queryKey: ordersKeys.list(params),
    queryFn: async () => {
      return graphqlRequest<{
        marketplaceOrders: {
          items: AdminOrderDto[];
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
        items: r.marketplaceOrders.items.map(mapOrder),
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
      const data = await graphqlRequest<{ marketplaceOrder: AdminOrderDto }>(MARKETPLACE_ORDER_QUERY, { id });
      return mapOrder(data.marketplaceOrder);
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
