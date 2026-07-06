import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../../shared/api/client";
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

const MARKETPLACE_PRODUCTS_QUERY = `query MarketplaceProducts($page: Int, $pageSize: Int, $search: String, $type: String, $status: String) {
  marketplaceProducts(page: $page, pageSize: $pageSize, search: $search, type: $type, status: $status) {
    items {
      id
      name
      type
      status
      basePrice
      currency
      description
      metadata
    }
    total
    page
    pageSize
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

export function useCoupons(params: CouponsListParams = {}) {
  return useQuery<PaginatedResponse<Coupon>, Error>({
    queryKey: catalogKeys.coupons(params),
    queryFn: async () => {
      // MOCK: replace with apiClient.get("/coupons", { params }) when BE ready
      void apiClient;
      let items = [...mockCoupons];
      if (params.status) items = items.filter((c) => c.status === params.status);
      if (params.search) {
        const q = params.search.toLowerCase();
        items = items.filter((c) => c.code.toLowerCase().includes(q));
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
    },
  });
}

export function useCouponStats(id: string | undefined) {
  return useQuery<CouponStats, Error>({
    queryKey: catalogKeys.couponStats(id),
    queryFn: async () => {
      // MOCK: replace with apiClient.get(`/coupons/${id}/stats`) when BE ready
      void apiClient;
      return {
        uses: 12,
        uniqueUsers: 10,
        revenueImpact: -2_400_000,
        usageByDay: [{ date: "2026-07-01", count: 2 }],
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
      return graphqlRequest<{ marketplaceProducts: PaginatedResponse<Product> }>(
        MARKETPLACE_PRODUCTS_QUERY,
        {
          page: params.page,
          pageSize: params.pageSize,
          search: params.search,
          type: params.type,
          status: params.status,
        }
      ).then((r) => r.marketplaceProducts);
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

export function useFulfillments(params: FulfillmentsListParams = {}) {
  return useQuery<PaginatedResponse<Fulfillment>, Error>({
    queryKey: catalogKeys.fulfillments(params),
    queryFn: async () => {
      // MOCK: replace with apiClient.get("/marketplace/fulfillments", { params }) when BE ready
      void apiClient;
      let items = [...mockFulfillments];
      if (params.status) items = items.filter((f) => f.status === params.status);
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
