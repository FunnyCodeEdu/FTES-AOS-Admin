import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, coreClient } from "../../../../shared/api/client";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import type {
  PaginatedResponse,
  Wallet,
  WalletAdjustment,
  WalletTransaction,
  WalletTransactionType,
} from "../../shared/types";
import { walletsKeys } from "./wallets.keys";

interface BEPage<T> {
  items: T[];
  page: number;
  totalElements: number;
}

// BE: GET /api/v1/wallet/admin/wallets/{userId} → WalletView {walletId, balance, status} (perm wallet.read).
// LƯU Ý: wallet module không giữ danh tính user (name/email) → chỉ có balance + status.
interface WalletView {
  walletId: string;
  balance: number;
  status: string; // ACTIVE | ...
}

export function useWallet(userId: string | undefined) {
  return useQuery<Wallet, Error>({
    queryKey: walletsKeys.wallet(userId),
    queryFn: async () => {
      if (!userId) throw new Error("Missing userId");
      const res = await coreClient.get(`/wallet/admin/wallets/${userId}`);
      const w = res.data as WalletView;
      return {
        userId,
        userName: userId, // TODO(BE): name/email nằm ở module identity, wallet không expose.
        userEmail: "",
        balance: w.balance,
        currency: "COIN",
        status: w.status === "ACTIVE" ? "active" : "frozen",
      };
    },
    enabled: !!userId,
  });
}

// BE: GET /api/v1/wallet/admin/transactions → search GLOBAL type/from/to (perm wallet.read).
// TransactionView {id, type, status, amount, direction, counterparty, memo, createdAt}.
// KHÔNG nested-by-user: đây là tra cứu giao dịch toàn hệ theo type/khoảng thời gian.
interface TransactionView {
  id: string;
  type: string;
  status: string;
  amount: number;
  direction: string; // "+" | "-"
  counterparty?: string;
  memo?: string;
  createdAt: string;
}

const TXN_TYPE_MAP: Record<string, WalletTransactionType> = {
  PURCHASE: "payment",
  ADMIN_ADJUST: "adjustment",
  REFUND: "refund",
  TOPUP: "deposit",
  DEPOSIT: "deposit",
  WITHDRAWAL: "withdrawal",
};

function mapTxn(v: TransactionView): WalletTransaction {
  const signed = v.direction === "-" ? -Math.abs(v.amount) : Math.abs(v.amount);
  return {
    id: v.id,
    type: TXN_TYPE_MAP[v.type] ?? "adjustment",
    amount: signed,
    // BE search toàn hệ không trả số dư trước/sau theo từng ví.
    balanceBefore: 0,
    balanceAfter: 0,
    currency: "COIN",
    reason: v.memo,
    actorName: v.counterparty,
    createdAt: v.createdAt,
  };
}

export interface LedgerParams {
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  [key: string]: string | number | undefined;
}

export function useWalletLedger(userId: string | undefined, params: LedgerParams = {}) {
  return useQuery<PaginatedResponse<WalletTransaction>, Error>({
    queryKey: walletsKeys.ledger(userId, params),
    queryFn: async () => {
      // Tra cứu giao dịch TOÀN HỆ (không lọc theo userId — BE không hỗ trợ nested-by-user ở admin search).
      const res = await coreClient.get("/wallet/admin/transactions", {
        params: {
          type: params.type || undefined,
          from: params.dateFrom || undefined,
          to: params.dateTo || undefined,
          page: Math.max(0, (params.page ?? 1) - 1),
          size: params.pageSize ?? 10,
        },
      });
      const data = res.data as BEPage<TransactionView>;
      return {
        items: data.items.map(mapTxn),
        total: data.totalElements,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
      };
    },
    enabled: !!userId,
  });
}

// BE: POST /api/v1/wallet/admin/adjustments (perm wallet.adjust). Áp dụng NGAY, không có dual-approval.
interface AdjustmentView {
  transactionId: string;
  balanceAfter: number;
}

export function useCreateAdjustment() {
  const qc = useQueryClient();
  return useMutation<
    WalletAdjustment,
    Error,
    { userId: string; amount: number; reason: string; threshold: number }
  >({
    mutationFn: async ({ userId, amount, reason }) => {
      const res = await coreClient.post("/wallet/admin/adjustments", {
        userId,
        amount: Math.abs(amount),
        direction: amount >= 0 ? "CREDIT" : "DEBIT",
        reason,
        idempotencyKey: crypto.randomUUID(),
      });
      const v = res.data as AdjustmentView;
      // BE áp dụng ngay → luôn "applied" (không có trạng thái chờ duyệt).
      return {
        id: v.transactionId,
        userId,
        userName: userId,
        amount,
        currency: "COIN",
        reason,
        status: "applied",
        createdBy: "",
        createdByName: "",
        createdAt: new Date().toISOString(),
      };
    },
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: walletsKeys.wallet(userId) });
      qc.invalidateQueries({ queryKey: walletsKeys.ledger(userId, {}) });
      qc.invalidateQueries({ queryKey: walletsKeys.pendingAdjustments({}) });
    },
    onError: handleAdminMutationError,
  });
}

// ------------------------------------------------------------------ pending / dual-approval
// TODO(BE): module wallet KHÔNG có khái niệm điều chỉnh chờ duyệt (adjust áp dụng ngay trong
// AdjustmentService). Các hook dưới giữ MOCK cho tới khi BE bổ sung dual-approval.
const mockAdjustments: WalletAdjustment[] = [];

export function usePendingAdjustments(params: { page?: number; pageSize?: number } = {}) {
  return useQuery<PaginatedResponse<WalletAdjustment>, Error>({
    queryKey: walletsKeys.pendingAdjustments(params),
    queryFn: async () => {
      void apiClient;
      const items = mockAdjustments.filter((a) => a.status === "pending_approval");
      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 10;
      const start = (page - 1) * pageSize;
      return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
    },
  });
}

export function useApproveAdjustment() {
  const qc = useQueryClient();
  return useMutation<WalletAdjustment, Error, { id: string; reason?: string }>({
    mutationFn: async ({ id }) => {
      // TODO(BE): không có luồng duyệt (adjust áp dụng ngay). Mock.
      void apiClient;
      const adjustment = mockAdjustments.find((a) => a.id === id);
      if (!adjustment) throw new Error("Adjustment not found");
      adjustment.status = "applied";
      return adjustment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: walletsKeys.pendingAdjustments({}) }),
  });
}

export function useRejectAdjustment() {
  const qc = useQueryClient();
  return useMutation<WalletAdjustment, Error, { id: string; reason: string }>({
    mutationFn: async ({ id, reason }) => {
      // TODO(BE): không có luồng từ chối. Mock.
      void apiClient;
      const adjustment = mockAdjustments.find((a) => a.id === id);
      if (!adjustment) throw new Error("Adjustment not found");
      adjustment.status = "rejected";
      adjustment.rejectionReason = reason;
      return adjustment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: walletsKeys.pendingAdjustments({}) }),
  });
}
