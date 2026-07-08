import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, coreClient } from "../../../../shared/api/client";
import { graphqlRequest } from "../../../../shared/api/graphql";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import type {
  Coupon,
  CouponStats,
  Fulfillment,
  PaginatedResponse,
  Product,
  ProductStatus,
  ProductType,
} from "../../shared/types";
import { catalogKeys } from "./catalog.keys";

const MARKETPLACE_PRODUCTS_QUERY = `query MarketplaceProducts($filter: AdminProductFilter, $page: PageInput) {
  marketplaceProducts(filter: $filter, page: $page) {
    items {
      id
      name
      slug
      priceVnd
      priceCoin
      status
      type
    }
    total
    page
    size
  }
}`;

const mockCoupons: Coupon[] = [
  {
    id: "c-1",
    code: "SUMMER2026",
    type: "percent",
    value: 20,
    maxUses: 100,
    usedCount: 12,
    perUserLimit: 1,
    validFrom: "2026-06-01T00:00:00Z",
    validTo: "2026-08-31T23:59:59Z",
    appliesTo: ["course_unlock"],
    status: "active",
  },
];

const mockProducts: Product[] = [
  {
    id: "p-1",
    name: "Áo thun FTES",
    type: "merchandise",
    status: "active",
    basePrice: 250_000,
    currency: "VND",
    description: "Áo thun chất liệu cotton",
    metadata: { sizes: ["M", "L", "XL"] },
  },
  {
    id: "p-2",
    name: "Gói AI Credits 100",
    type: "ai_credits",
    status: "active",
    basePrice: 500_000,
    currency: "VND",
    metadata: { credits: 100 },
  },
];

const mockFulfillments: Fulfillment[] = [
  {
    id: "f-1",
    orderId: "ord-3",
    orderCode: "ORD-20260702-088",
    productName: "Áo thun FTES",
    recipientName: "Nguyễn Văn A",
    address: "Hà Nội",
    status: "pending",
    updatedAt: "2026-07-04T00:00:00Z",
  },
];

export interface CouponsListParams {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  [key: string]: string | number | undefined;
}

// BE: GET /api/v1/commerce/admin/coupons (perm coupon.manage).
// CouponAdminView {id, couponName, percent, maxDiscountAmount, minPrice, quantity, active, startDate, endDate, usedCount}.
interface CouponAdminView {
  id: string;
  couponName: string;
  percent: number;
  maxDiscountAmount?: number;
  minPrice?: number;
  quantity: number;
  active: boolean;
  startDate?: string;
  endDate?: string;
  usedCount: number;
}
interface CoreBEPage<T> {
  items: T[];
  page: number;
  totalElements: number;
}

function mapCoupon(v: CouponAdminView): Coupon {
  return {
    id: v.id,
    code: v.couponName,
    type: "percent", // BE coupon chỉ hỗ trợ giảm theo phần trăm.
    value: v.percent,
    maxUses: v.quantity + v.usedCount, // quantity = lượt còn lại; ước lượng tổng.
    usedCount: v.usedCount,
    validFrom: v.startDate,
    validTo: v.endDate,
    appliesTo: [],
    status: v.active ? "active" : "inactive",
  };
}

export function useCoupons(params: CouponsListParams = {}) {
  return useQuery<PaginatedResponse<Coupon>, Error>({
    queryKey: catalogKeys.coupons(params),
    queryFn: async () => {
      const res = await coreClient.get("/commerce/admin/coupons", {
        params: {
          q: params.search || undefined,
          page: Math.max(0, (params.page ?? 1) - 1),
          size: params.pageSize ?? 10,
        },
      });
      const data = res.data as CoreBEPage<CouponAdminView>;
      let items = data.items.map(mapCoupon);
      if (params.status) items = items.filter((c) => c.status === params.status);
      return {
        items,
        total: data.totalElements,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
      };
    },
  });
}

export function useCouponStats(id: string | undefined) {
  return useQuery<CouponStats, Error>({
    queryKey: catalogKeys.couponStats(id),
    queryFn: async () => {
      // BE: GET /api/v1/commerce/admin/coupons/{id}/stats (perm coupon.manage).
      const res = await coreClient.get(`/commerce/admin/coupons/${id}/stats`);
      const d = res.data as { uses: number; uniqueUsers: number; revenueImpact: number; usageByDay: { date: string; count: number }[] };
      return {
        uses: d.uses,
        uniqueUsers: d.uniqueUsers,
        revenueImpact: -Math.abs(d.revenueImpact ?? 0), // discount đã cấp → tác động âm lên doanh thu.
        usageByDay: d.usageByDay ?? [], // TODO(BE): chưa có aggregation theo ngày.
      };
    },
    enabled: !!id,
  });
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation<Coupon, Error, Omit<Coupon, "id" | "usedCount">>({
    mutationFn: async (values) => {
      // MOCK: replace with apiClient.post("/coupons", values) when BE ready
      void apiClient;
      const next: Coupon = { ...values, id: `c-${Date.now()}`, usedCount: 0 };
      mockCoupons.push(next);
      return next;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.coupons({}) }),
  });
}

export function useUpdateCoupon() {
  const qc = useQueryClient();
  return useMutation<Coupon, Error, Coupon>({
    mutationFn: async (values) => {
      // MOCK: replace with apiClient.put(`/coupons/${values.id}`, values) when BE ready
      void apiClient;
      const idx = mockCoupons.findIndex((c) => c.id === values.id);
      if (idx === -1) throw new Error("Coupon not found");
      mockCoupons[idx] = values;
      return values;
    },
    onSuccess: (_, values) => {
      qc.invalidateQueries({ queryKey: catalogKeys.coupons({}) });
      qc.invalidateQueries({ queryKey: catalogKeys.couponStats(values.id) });
    },
  });
}

export function useDisableCoupon() {
  const qc = useQueryClient();
  return useMutation<Coupon, Error, { id: string; reason: string }>({
    mutationFn: async ({ id, reason }) => {
      const res = await apiClient.post(`/coupons/${id}/disable`, { reason });
      return res.data as Coupon;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: catalogKeys.coupons({}) });
      qc.invalidateQueries({ queryKey: catalogKeys.couponStats(id) });
    },
    onError: handleAdminMutationError,
  });
}

export interface ProductsListParams {
  type?: ProductType;
  status?: ProductStatus;
  search?: string;
  page?: number;
  pageSize?: number;
  [key: string]: string | number | ProductType | ProductStatus | undefined;
}

const MOCK_ENABLED_PRODUCTS = false;

export function useProducts(params: ProductsListParams = {}) {
  return useQuery<PaginatedResponse<Product>, Error>({
    queryKey: catalogKeys.products(params),
    queryFn: async () => {
      if (MOCK_ENABLED_PRODUCTS) {
        void apiClient;
        let items = [...mockProducts];
        if (params.type) items = items.filter((p) => p.type === params.type);
        if (params.status) items = items.filter((p) => p.status === params.status);
        if (params.search) {
          const q = params.search.toLowerCase();
          items = items.filter((p) => p.name.toLowerCase().includes(q));
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
      return graphqlRequest<{
        marketplaceProducts: {
          items: Array<{
            id: string;
            name: string;
            slug?: string;
            priceVnd?: number;
            priceCoin?: string;
            status: string;
            type: string;
          }>;
          total: number;
          page: number;
          size: number;
        };
      }>(MARKETPLACE_PRODUCTS_QUERY, {
        filter: {
          ...(params.search ? { q: params.search } : {}),
          ...(params.status ? { status: params.status } : {}),
          ...(params.type ? { type: params.type } : {}),
        },
        page: { page: Math.max(0, (params.page ?? 1) - 1), size: params.pageSize ?? 10 },
      }).then((r) => ({
        items: r.marketplaceProducts.items.map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type as Product["type"],
          status: item.status as Product["status"],
          basePrice: item.priceVnd ?? 0,
          currency: item.priceCoin ?? "VND",
          description: undefined,
          metadata: undefined,
        })),
        total: r.marketplaceProducts.total,
        page: (r.marketplaceProducts.page ?? 0) + 1,
        pageSize: r.marketplaceProducts.size,
      }));
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation<Product, Error, Omit<Product, "id">>({
    mutationFn: async (values) => {
      // MOCK: replace with apiClient.post("/marketplace/products", values) when BE ready
      void apiClient;
      const next: Product = { ...values, id: `p-${Date.now()}` };
      mockProducts.push(next);
      return next;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.products({}) }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation<Product, Error, Product>({
    mutationFn: async (values) => {
      // MOCK: replace with apiClient.put(`/marketplace/products/${values.id}`, values) when BE ready
      void apiClient;
      const idx = mockProducts.findIndex((p) => p.id === values.id);
      if (idx === -1) throw new Error("Product not found");
      mockProducts[idx] = values;
      return values;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.products({}) }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation<string, Error, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/marketplace/products/${id}`);
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.products({}) }),
    onError: handleAdminMutationError,
  });
}

export interface FulfillmentsListParams {
  status?: string;
  page?: number;
  pageSize?: number;
  [key: string]: string | number | undefined;
}

// BE: GET /api/v1/commerce/admin/fulfillments (perm commerce.order.read).
// FulfillmentView {id, orderId, productId, quantity, fulfillmentStatus, fulfillmentAttempts}.
// LƯU Ý: order_items KHÔNG mô hình hoá recipient/address/tracking → các trường đó để trống.
interface FulfillmentView {
  id: string;
  orderId: string;
  productId?: string;
  quantity: number;
  fulfillmentStatus: string; // PENDING | DONE | FAILED
  fulfillmentAttempts: number;
}

function mapFulfillment(v: FulfillmentView): Fulfillment {
  return {
    id: v.id,
    orderId: v.orderId,
    orderCode: v.orderId,
    productName: v.productId ?? "", // TODO(BE): tên sản phẩm cần join products.
    recipientName: "", // TODO(BE): recipient/address chưa mô hình hoá trong order_items.
    status: v.fulfillmentStatus === "DONE" ? "delivered" : "pending",
    updatedAt: "",
  };
}

// BE fulfillment_status: PENDING | DONE | FAILED. FE filter dùng pending/packed/shipped/delivered.
const FE_TO_BE_FULFILL: Record<string, string> = {
  pending: "PENDING",
  delivered: "DONE",
};

export function useFulfillments(params: FulfillmentsListParams = {}) {
  return useQuery<PaginatedResponse<Fulfillment>, Error>({
    queryKey: catalogKeys.fulfillments(params),
    queryFn: async () => {
      const beStatus = params.status ? FE_TO_BE_FULFILL[params.status] ?? params.status : undefined;
      const res = await coreClient.get("/commerce/admin/fulfillments", {
        params: {
          status: beStatus,
          page: Math.max(0, (params.page ?? 1) - 1),
          size: params.pageSize ?? 10,
        },
      });
      const data = res.data as CoreBEPage<FulfillmentView>;
      return {
        items: data.items.map(mapFulfillment),
        total: data.totalElements,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
      };
    },
  });
}

export function useUpdateFulfillmentStatus() {
  const qc = useQueryClient();
  return useMutation<Fulfillment, Error, { id: string; status: string; trackingCode?: string; note?: string }>({
    mutationFn: async ({ id, status, trackingCode }) => {
      // MOCK: replace with apiClient.put(`/marketplace/fulfillments/${id}/status`, { status, trackingCode, note }) when BE ready
      void apiClient;
      const f = mockFulfillments.find((x) => x.id === id);
      if (!f) throw new Error("Fulfillment not found");
      f.status = status as Fulfillment["status"];
      if (trackingCode !== undefined) f.trackingCode = trackingCode;
      f.updatedAt = new Date().toISOString();
      return f;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.fulfillments({}) }),
  });
}
