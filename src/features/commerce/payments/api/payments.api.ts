import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../../shared/api/client";
import type {
  CommerceConfig,
  PaginatedResponse,
  Payment,
  ReconciliationReport,
  RevenueSummary,
} from "../../shared/types";
import { paymentsKeys } from "./payments.keys";

const mockPayments: Payment[] = [
  {
    id: "pay-1",
    transactionCode: "TXN-12345",
    amount: 2_000_000,
    currency: "VND",
    matchStatus: "matched",
    orderId: "ord-2",
    orderCode: "ORD-20260703-102",
    receivedAt: "2026-07-03T08:05:00Z",
    bankName: "Vietcombank",
  },
  {
    id: "pay-2",
    transactionCode: "TXN-99999",
    amount: 1_000_000,
    currency: "VND",
    matchStatus: "unmatched",
    receivedAt: "2026-07-04T10:00:00Z",
    bankName: "BIDV",
  },
];

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
      // MOCK: replace with apiClient.get("/payments", { params }) when BE ready
      void apiClient;
      let items = [...mockPayments];
      if (params.matchStatus) items = items.filter((p) => p.matchStatus === params.matchStatus);
      if (params.search) {
        const q = params.search.toLowerCase();
        items = items.filter((p) => p.transactionCode.toLowerCase().includes(q));
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

export function useReconciliation(dateFrom: string, dateTo: string) {
  return useQuery<ReconciliationReport, Error>({
    queryKey: paymentsKeys.reconciliation({ dateFrom, dateTo }),
    queryFn: async () => {
      // MOCK: replace with apiClient.get("/payments/reconciliation", { params: { dateFrom, dateTo } }) when BE ready
      void apiClient;
      return {
        dateFrom,
        dateTo,
        summary: { matched: 1, mismatched: 1, missing: 0 },
        rows: [
          {
            id: "rec-1",
            status: "webhook_unmatched",
            amount: 1_000_000,
            currency: "VND",
            paymentId: "pay-2",
            transactionCode: "TXN-99999",
            occurredAt: "2026-07-04T10:00:00Z",
          },
        ],
      };
    },
    enabled: !!dateFrom && !!dateTo,
  });
}

export function useResolveReconciliationRow() {
  const qc = useQueryClient();
  return useMutation<
    ReconciliationReport,
    Error,
    { rowId: string; action: "match_order" | "ignore" | "flag"; orderId?: string; note: string; dateFrom: string; dateTo: string }
  >({
    mutationFn: async (values) => {
      // MOCK: replace with apiClient.post(`/payments/reconciliation/${values.rowId}/resolve`, values) when BE ready
      void apiClient;
      return {
        dateFrom: values.dateFrom,
        dateTo: values.dateTo,
        summary: { matched: 2, mismatched: 0, missing: 0 },
        rows: [],
      };
    },
    onSuccess: (_, values) => {
      qc.invalidateQueries({ queryKey: paymentsKeys.reconciliation({ dateFrom: values.dateFrom, dateTo: values.dateTo }) });
      qc.invalidateQueries({ queryKey: paymentsKeys.list({}) });
    },
  });
}

export function useRevenueSummary() {
  return useQuery<RevenueSummary, Error>({
    queryKey: paymentsKeys.revenue,
    queryFn: async () => {
      // MOCK: replace with apiClient.get("/revenue/summary") when BE ready
      void apiClient;
      return {
        today: 5_000_000,
        last7d: 35_000_000,
        last30d: 120_000_000,
        byProductType: [
          { productType: "course_unlock", amount: 80_000_000 },
          { productType: "premium", amount: 30_000_000 },
          { productType: "merchandise", amount: 10_000_000 },
        ],
      };
    },
    staleTime: 60_000,
  });
}

export function useCommerceConfig() {
  return useQuery<CommerceConfig, Error>({
    queryKey: paymentsKeys.config,
    queryFn: async () => {
      // MOCK: replace with apiClient.get("/config/commerce") when BE ready
      void apiClient;
      return {
        walletAdjustDualApprovalThreshold: 1_000_000,
        currency: "VND",
      };
    },
    staleTime: Infinity,
  });
}
