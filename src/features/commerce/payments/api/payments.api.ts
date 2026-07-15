import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coreClient } from "../../../../shared/api/client";
import type {
  CommerceConfig,
  PaginatedResponse,
  Payment,
  PaymentMatchStatus,
  ReconciliationReport,
  ReconciliationRow,
  RevenueSummary,
} from "../../shared/types";
import { paymentsKeys } from "./payments.keys";

interface BEPage<T> {
  items: T[];
  page: number;
  totalElements: number;
}

// ------------------------------------------------------------------ payments
// BE: GET /api/v1/commerce/admin/payments (perm commerce.order.read).
// PaymentView = {id, orderId, gateway, amount, status, txnRef, createdAt, confirmedAt}.
interface PaymentView {
  id: string;
  orderId: string;
  gateway: string;
  amount: number;
  status: string; // INITIATED | SUCCEEDED | FAILED
  txnRef?: string;
  createdAt: string;
  confirmedAt?: string;
}

function mapMatchStatus(be: string): PaymentMatchStatus {
  // BE payment.status không phải khái niệm reconciliation-match; map thô cho cột trạng thái.
  return be === "SUCCEEDED" ? "matched" : "unmatched";
}

function mapPayment(v: PaymentView): Payment {
  return {
    id: v.id,
    transactionCode: v.txnRef ?? v.id,
    amount: v.amount,
    currency: "VND",
    matchStatus: mapMatchStatus(v.status),
    orderId: v.orderId,
    orderCode: v.orderId,
    receivedAt: v.confirmedAt ?? v.createdAt,
    bankName: v.gateway,
  };
}

export interface PaymentsListParams {
  matchStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  [key: string]: string | number | undefined;
}

export function usePayments(params: PaymentsListParams = {}) {
  return useQuery<PaginatedResponse<Payment>, Error>({
    queryKey: paymentsKeys.list(params),
    queryFn: async () => {
      const res = await coreClient.get("/commerce/admin/payments", {
        params: {
          q: params.search || undefined,
          from: params.dateFrom || undefined,
          to: params.dateTo || undefined,
          page: Math.max(0, (params.page ?? 1) - 1),
          size: params.pageSize ?? 10,
        },
      });
      const data = res.data as BEPage<PaymentView>;
      let items = data.items.map(mapPayment);
      // BE filter theo payment.status; matchStatus là khái niệm FE → lọc client-side.
      if (params.matchStatus) items = items.filter((p) => p.matchStatus === params.matchStatus);
      return {
        items,
        total: data.totalElements,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
      };
    },
  });
}

// ------------------------------------------------------------------ reconciliation runs
// BE: GET /api/v1/commerce/admin/reconciliation/runs (perm commerce.reconcile).
// ReconciliationRunView = {id, mismatchCount, ranAt}. BE chỉ có LỊCH SỬ LẦN CHẠY đối soát,
// không có report theo date-range hay danh sách dòng lệch chi tiết → map mỗi run thành 1 "row".
interface ReconciliationRunView {
  id: string;
  mismatchCount: number;
  ranAt: string;
}

export function useReconciliation(dateFrom: string, dateTo: string) {
  return useQuery<ReconciliationReport, Error>({
    queryKey: paymentsKeys.reconciliation({ dateFrom, dateTo }),
    queryFn: async () => {
      const res = await coreClient.get("/commerce/admin/reconciliation/runs", {
        params: { page: 0, size: 50 },
      });
      const data = res.data as BEPage<ReconciliationRunView>;
      // TODO(BE): endpoint runs không nhận dateFrom/dateTo; lọc theo range hiện chưa hỗ trợ.
      const rows: ReconciliationRow[] = data.items.map((r) => ({
        id: r.id,
        status: r.mismatchCount > 0 ? "webhook_unmatched" : "resolved",
        amount: 0,
        currency: "VND",
        occurredAt: r.ranAt,
        note: `Lần chạy đối soát • ${r.mismatchCount} lệch`,
      }));
      const mismatched = data.items.reduce((s, r) => s + (r.mismatchCount ?? 0), 0);
      return {
        dateFrom,
        dateTo,
        summary: { matched: data.items.length - (mismatched > 0 ? 1 : 0), mismatched, missing: 0 },
        rows,
      };
    },
    enabled: true,
  });
}

// BE: POST /api/v1/commerce/admin/orders/{orderId}/recheck (perm commerce.reconcile,
// CommerceAdminController.recheckOrder) → WebhookService.RecheckResult. Đây là endpoint
// "xử lý dòng lệch" duy nhất BE có: re-query payment của đơn, khớp amount thì xác nhận PAID.
// Các action ignore/flag (lưu ghi chú/cờ điều tra) BE CHƯA có → UI disable.
export interface RecheckResult {
  matched: boolean;
  orderStatus: string;
  paymentCount: number;
  txnRef?: string;
}

export function useResolveReconciliationRow() {
  const qc = useQueryClient();
  return useMutation<
    RecheckResult,
    Error,
    { orderId: string; dateFrom: string; dateTo: string }
  >({
    mutationFn: async ({ orderId }) => {
      const res = await coreClient.post(`/commerce/admin/orders/${encodeURIComponent(orderId)}/recheck`);
      return res.data as RecheckResult;
    },
    onSuccess: (_, values) => {
      qc.invalidateQueries({ queryKey: paymentsKeys.reconciliation({ dateFrom: values.dateFrom, dateTo: values.dateTo }) });
      qc.invalidateQueries({ queryKey: paymentsKeys.list({}) });
    },
  });
}

// ------------------------------------------------------------------ revenue
// BE: GET /api/v1/commerce/admin/revenue/summary (perm commerce.reconcile).
interface RevenueSummaryView {
  today: number;
  last7d: number;
  last30d: number;
  byProductType: { productType: string; amount: number }[];
}

export function useRevenueSummary() {
  return useQuery<RevenueSummary, Error>({
    queryKey: paymentsKeys.revenue,
    queryFn: async () => {
      const res = await coreClient.get("/commerce/admin/revenue/summary");
      const d = res.data as RevenueSummaryView;
      return {
        today: d.today ?? 0,
        last7d: d.last7d ?? 0,
        last30d: d.last30d ?? 0,
        byProductType: (d.byProductType ?? []).map((b) => ({
          productType: b.productType,
          amount: b.amount,
        })),
      };
    },
    staleTime: 60_000,
  });
}

export function useCommerceConfig() {
  return useQuery<CommerceConfig, Error>({
    queryKey: paymentsKeys.config,
    queryFn: async () => {
      // BE: GET /wallet/admin/adjustments/config → {dualApprovalThreshold} (perm wallet.adjust).
      const res = await coreClient.get<{ dualApprovalThreshold: number }>(
        "/wallet/admin/adjustments/config",
      );
      return {
        walletAdjustDualApprovalThreshold: res.data.dualApprovalThreshold,
        currency: "VND",
      };
    },
    staleTime: Infinity,
  });
}
