import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, coreClient } from "../../../../shared/api/client";
import { graphqlRequest } from "../../../../shared/api/graphql";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import type {
  Coupon,
  CouponStats,
  Fulfillment,
  FulfillmentStatus,
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

// Response các endpoint WRITE (CommerceAdminController) là CouponView — KHÔNG có usedCount
// (khác CouponAdminView của read) → coi usedCount = 0 để tránh NaN; list sẽ được invalidate.
type CouponWriteView = Omit<CouponAdminView, "usedCount"> & { prefix?: string };

function mapCoupon(v: CouponAdminView | CouponWriteView): Coupon {
  const usedCount = "usedCount" in v ? v.usedCount : 0;
  return {
    id: v.id,
    code: v.couponName,
    type: "percent", // BE coupon chỉ hỗ trợ giảm theo phần trăm.
    value: v.percent,
    maxUses: v.quantity + usedCount, // quantity = lượt còn lại; ước lượng tổng.
    usedCount,
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

// Map form coupon FE (Coupon-shaped) → body BE. BE chỉ hỗ trợ giảm theo %:
// couponName←code, percent←value, quantity←maxUses (tổng lượt phát hành),
// startDate←validFrom, endDate←validTo. maxDiscountAmount/minPrice/prefix: form chưa có → BE default.
function toCouponBody(v: Partial<Coupon>) {
  return {
    couponName: v.code,
    percent: v.value,
    startDate: v.validFrom,
    endDate: v.validTo,
    quantity: v.maxUses,
  };
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation<Coupon, Error, Omit<Coupon, "id" | "usedCount">>({
    mutationFn: async (values) => {
      // BE: POST /api/v1/commerce/admin/coupons (CommerceAdminController, perm coupon.manage)
      // → dùng coreClient (base /api/v1); apiClient (base /api/v1/admin) sẽ 404.
      const res = await coreClient.post("/commerce/admin/coupons", toCouponBody(values));
      return mapCoupon(res.data as CouponWriteView);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.coupons({}) }),
  });
}

export function useUpdateCoupon() {
  const qc = useQueryClient();
  return useMutation<Coupon, Error, Coupon>({
    mutationFn: async (values) => {
      // BE: PUT /api/v1/commerce/admin/coupons/{id} — partial update, field null giữ nguyên.
      const res = await coreClient.put(`/commerce/admin/coupons/${values.id}`, toCouponBody(values));
      return mapCoupon(res.data as CouponWriteView);
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
    mutationFn: async ({ id }) => {
      // BE: POST /api/v1/commerce/admin/coupons/{id}/disable — set is_active=false, không xoá.
      const res = await coreClient.post(`/commerce/admin/coupons/${id}/disable`);
      return mapCoupon(res.data as CouponWriteView);
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
          // BE parseEnum cần đúng tên enum: inactive→ARCHIVED, premium→PREMIUM_SUBSCRIPTION.
          ...(params.status ? { status: FE_TO_BE_PRODUCT_STATUS[params.status] } : {}),
          ...(params.type ? { type: FE_TO_BE_PRODUCT_TYPE[params.type] } : {}),
        },
        page: { page: Math.max(0, (params.page ?? 1) - 1), size: params.pageSize ?? 10 },
      }).then((r) => ({
        items: r.marketplaceProducts.items.map((item) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
          // GraphQL trả enum BE UPPER_SNAKE (ProductEntity .name()) → normalize về union FE.
          type: BE_TO_FE_PRODUCT_TYPE[item.type] ?? (item.type as Product["type"]),
          status: BE_TO_FE_PRODUCT_STATUS[item.status] ?? (item.status as Product["status"]),
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

// ------------------------------------------------------------------ product write
// BE: ProductController /api/v1/commerce/admin/products (perm commerce.product.manage), body
// ProductUpsertRequest {type UPPER_SNAKE, name, slug @NotBlank, description, priceVnd, priceCoin,
// fulfillmentConfig @NotBlank (JSON theo type), stockQuantity, status DRAFT|ACTIVE|ARCHIVED}.
const FE_TO_BE_PRODUCT_TYPE: Record<ProductType, string> = {
  merchandise: "MERCHANDISE",
  premium: "PREMIUM_SUBSCRIPTION",
  ai_credits: "AI_CREDITS",
  voucher: "VOUCHER",
  course_unlock: "COURSE_UNLOCK",
};
const BE_TO_FE_PRODUCT_TYPE: Record<string, ProductType> = {
  MERCHANDISE: "merchandise",
  PREMIUM_SUBSCRIPTION: "premium",
  AI_CREDITS: "ai_credits",
  VOUCHER: "voucher",
  COURSE_UNLOCK: "course_unlock",
};
// FE "inactive" ↔ BE ARCHIVED (BE không có trạng thái inactive riêng).
const FE_TO_BE_PRODUCT_STATUS: Record<ProductStatus, string> = {
  active: "ACTIVE",
  inactive: "ARCHIVED",
  draft: "DRAFT",
};
const BE_TO_FE_PRODUCT_STATUS: Record<string, ProductStatus> = {
  ACTIVE: "active",
  ARCHIVED: "inactive",
  DRAFT: "draft",
};

function slugify(name: string): string {
  // NFD tách dấu tiếng Việt thành combining mark (U+0300..U+036F) rồi lọc bỏ theo codepoint.
  const noAccent = Array.from(name.normalize("NFD"))
    .filter((ch) => {
      const c = ch.codePointAt(0) ?? 0;
      return c < 0x0300 || c > 0x036f;
    })
    .join("");
  return noAccent
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toProductBody(v: Omit<Product, "id">) {
  return {
    type: FE_TO_BE_PRODUCT_TYPE[v.type],
    name: v.name,
    slug: v.slug || slugify(v.name), // BE @NotBlank; giữ slug cũ khi sửa, sinh từ tên khi tạo.
    description: v.description,
    priceVnd: v.basePrice,
    // BE @NotBlank + validate field theo type (vd MERCHANDISE cần sku) — lấy từ metadata của form.
    fulfillmentConfig: JSON.stringify(v.metadata ?? {}),
    status: FE_TO_BE_PRODUCT_STATUS[v.status],
  };
}

// Response write: CommerceDtos.ProductView {id, type, name, slug, description, priceVnd, priceCoin,
// stockQuantity, status} — map về shape Product FE.
interface ProductViewBE {
  id: string;
  type: string;
  name: string;
  slug?: string;
  description?: string;
  priceVnd?: number;
  priceCoin?: number;
  stockQuantity?: number;
  status: string;
}

function mapProductView(v: ProductViewBE): Product {
  return {
    id: v.id,
    name: v.name,
    slug: v.slug,
    type: BE_TO_FE_PRODUCT_TYPE[v.type] ?? "merchandise",
    status: BE_TO_FE_PRODUCT_STATUS[v.status] ?? "draft",
    basePrice: v.priceVnd ?? 0,
    currency: "VND",
    description: v.description,
  };
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation<Product, Error, Omit<Product, "id">>({
    mutationFn: async (values) => {
      const res = await coreClient.post("/commerce/admin/products", toProductBody(values));
      return mapProductView(res.data as ProductViewBE);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.products({}) }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation<Product, Error, Product>({
    mutationFn: async (values) => {
      const res = await coreClient.put(`/commerce/admin/products/${values.id}`, toProductBody(values));
      return mapProductView(res.data as ProductViewBE);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.products({}) }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation<string, Error, string>({
    mutationFn: async (id) => {
      // BE: DELETE /api/v1/commerce/admin/products/{id} — soft archive (status → ARCHIVED).
      await coreClient.delete(`/commerce/admin/products/${id}`);
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
// Response write (FulfillmentUpdateView) có thêm trackingCode + note.
// LƯU Ý: order_items KHÔNG mô hình hoá recipient/address → các trường đó để trống.
interface FulfillmentView {
  id: string;
  orderId: string;
  productId?: string;
  quantity: number;
  fulfillmentStatus: string; // PENDING | DONE | FAILED
  fulfillmentAttempts: number;
  trackingCode?: string; // chỉ có ở FulfillmentUpdateView (write); read view chưa trả.
  note?: string;
}

// BE fulfillment_status ↔ FE status. BE chỉ có PENDING | DONE | FAILED
// (FulfillmentUpdateRequest @Pattern) — không mô hình hoá packed/shipped.
const BE_TO_FE_FULFILL: Record<string, FulfillmentStatus> = {
  PENDING: "pending",
  DONE: "delivered",
  FAILED: "failed",
};
const FE_TO_BE_FULFILL: Record<FulfillmentStatus, string> = {
  pending: "PENDING",
  delivered: "DONE",
  failed: "FAILED",
};

function mapFulfillment(v: FulfillmentView): Fulfillment {
  return {
    id: v.id,
    orderId: v.orderId,
    orderCode: v.orderId,
    productName: v.productId ?? "", // TODO(BE): tên sản phẩm cần join products.
    recipientName: "", // TODO(BE): recipient/address chưa mô hình hoá trong order_items.
    status: BE_TO_FE_FULFILL[v.fulfillmentStatus] ?? "pending",
    trackingCode: v.trackingCode,
    updatedAt: "",
  };
}

export function useFulfillments(params: FulfillmentsListParams = {}) {
  return useQuery<PaginatedResponse<Fulfillment>, Error>({
    queryKey: catalogKeys.fulfillments(params),
    queryFn: async () => {
      const beStatus = params.status
        ? FE_TO_BE_FULFILL[params.status as FulfillmentStatus] ?? params.status
        : undefined;
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
  return useMutation<Fulfillment, Error, { id: string; status: FulfillmentStatus; trackingCode?: string; note?: string }>({
    mutationFn: async ({ id, status, trackingCode, note }) => {
      // BE: PUT /api/v1/commerce/admin/fulfillments/{itemId} (CommerceAdminController, perm
      // commerce.order.read) — coreClient (base /api/v1). Body FulfillmentUpdateRequest:
      // status @Pattern PENDING|DONE|FAILED, trackingCode ≤128, note ≤500.
      const res = await coreClient.put(`/commerce/admin/fulfillments/${id}`, {
        status: FE_TO_BE_FULFILL[status],
        trackingCode,
        note,
      });
      return mapFulfillment(res.data as FulfillmentView);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.fulfillments({}) }),
  });
}
