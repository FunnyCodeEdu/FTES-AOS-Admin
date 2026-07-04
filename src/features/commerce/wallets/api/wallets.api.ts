import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../../shared/api/client";
import type {
  PaginatedResponse,
  Wallet,
  WalletAdjustment,
  WalletTransaction,
} from "../../shared/types";
import { walletsKeys } from "./wallets.keys";

const mockWallets = new Map<string, Wallet>();
const mockLedgers = new Map<string, WalletTransaction[]>();
const mockAdjustments: WalletAdjustment[] = [];

function getOrInitWallet(userId: string): Wallet {
  if (!mockWallets.has(userId)) {
    mockWallets.set(userId, {
      userId,
      userName: `User ${userId}`,
      userEmail: `${userId}@example.com`,
      balance: 1_000_000,
      currency: "VND",
      status: "active",
    });
  }
  return mockWallets.get(userId)!;
}

function getOrInitLedger(userId: string): WalletTransaction[] {
  if (!mockLedgers.has(userId)) {
    mockLedgers.set(userId, [
      {
        id: "txn-1",
        type: "deposit",
        amount: 1_000_000,
        balanceBefore: 0,
        balanceAfter: 1_000_000,
        currency: "VND",
        reason: "Nạp tiền lần đầu",
        actorName: "Hệ thống",
        createdAt: "2026-07-01T00:00:00Z",
      },
    ]);
  }
  return mockLedgers.get(userId)!;
}

export function useWallet(userId: string | undefined) {
  return useQuery<Wallet, Error>({
    queryKey: walletsKeys.wallet(userId),
    queryFn: async () => {
      // MOCK: replace with apiClient.get(`/wallets/${userId}`) when BE ready
      void apiClient;
      if (!userId) throw new Error("Missing userId");
      return getOrInitWallet(userId);
    },
    enabled: !!userId,
  });
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
      // MOCK: replace with apiClient.get(`/wallets/${userId}/transactions`, { params }) when BE ready
      void apiClient;
      if (!userId) throw new Error("Missing userId");
      let items = [...getOrInitLedger(userId)];
      if (params.type) items = items.filter((t) => t.type === params.type);
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
    enabled: !!userId,
  });
}

export function useCreateAdjustment() {
  const qc = useQueryClient();
  return useMutation<
    WalletAdjustment,
    Error,
    { userId: string; amount: number; reason: string; threshold: number }
  >({
    mutationFn: async ({ userId, amount, reason, threshold }) => {
      // MOCK: replace with apiClient.post(`/wallets/${userId}/adjustments`, { amount, reason }) when BE ready
      void apiClient;
      const wallet = getOrInitWallet(userId);
      const status = Math.abs(amount) > threshold ? "pending_approval" : "applied";
      const adjustment: WalletAdjustment = {
        id: `adj-${Date.now()}`,
        userId,
        userName: wallet.userName,
        amount,
        currency: wallet.currency,
        reason,
        status,
        createdBy: "current-user",
        createdByName: "Current User",
        createdAt: new Date().toISOString(),
      };
      mockAdjustments.push(adjustment);
      if (status === "applied") {
        wallet.balance += amount;
        getOrInitLedger(userId).unshift({
          id: `txn-${Date.now()}`,
          type: "adjustment",
          amount,
          balanceBefore: wallet.balance - amount,
          balanceAfter: wallet.balance,
          currency: wallet.currency,
          reason,
          actorName: "Current User",
          createdAt: new Date().toISOString(),
        });
      }
      return adjustment;
    },
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: walletsKeys.wallet(userId) });
      qc.invalidateQueries({ queryKey: walletsKeys.ledger(userId, {}) });
      qc.invalidateQueries({ queryKey: walletsKeys.pendingAdjustments({}) });
    },
  });
}

export function usePendingAdjustments(params: { page?: number; pageSize?: number } = {}) {
  return useQuery<PaginatedResponse<WalletAdjustment>, Error>({
    queryKey: walletsKeys.pendingAdjustments(params),
    queryFn: async () => {
      // MOCK: replace with apiClient.get("/wallets/adjustments", { params: { status: 'pending', ... } }) when BE ready
      void apiClient;
      const items = mockAdjustments.filter((a) => a.status === "pending_approval");
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

export function useApproveAdjustment() {
  const qc = useQueryClient();
  return useMutation<WalletAdjustment, Error, { id: string; reason?: string }>({
    mutationFn: async ({ id }) => {
      // MOCK: replace with apiClient.post(`/wallets/adjustments/${id}/approve`) when BE ready
      void apiClient;
      const adjustment = mockAdjustments.find((a) => a.id === id);
      if (!adjustment) throw new Error("Adjustment not found");
      if (adjustment.status !== "pending_approval") throw new Error("409: Adjustment not pending");
      adjustment.status = "applied";
      adjustment.approvedBy = "current-approver";
      adjustment.approvedByName = "Current Approver";
      const wallet = getOrInitWallet(adjustment.userId);
      const balanceBefore = wallet.balance;
      wallet.balance += adjustment.amount;
      getOrInitLedger(adjustment.userId).unshift({
        id: `txn-${Date.now()}`,
        type: "adjustment",
        amount: adjustment.amount,
        balanceBefore,
        balanceAfter: wallet.balance,
        currency: wallet.currency,
        reason: adjustment.reason,
        actorName: "Current Approver",
        createdAt: new Date().toISOString(),
      });
      return adjustment;
    },
    onSuccess: (_, { id }) => {
      const adjustment = mockAdjustments.find((a) => a.id === id);
      if (adjustment) {
        qc.invalidateQueries({ queryKey: walletsKeys.wallet(adjustment.userId) });
        qc.invalidateQueries({ queryKey: walletsKeys.ledger(adjustment.userId, {}) });
      }
      qc.invalidateQueries({ queryKey: walletsKeys.pendingAdjustments({}) });
    },
  });
}

export function useRejectAdjustment() {
  const qc = useQueryClient();
  return useMutation<WalletAdjustment, Error, { id: string; reason: string }>({
    mutationFn: async ({ id, reason }) => {
      // MOCK: replace with apiClient.post(`/wallets/adjustments/${id}/reject`, { reason }) when BE ready
      void apiClient;
      const adjustment = mockAdjustments.find((a) => a.id === id);
      if (!adjustment) throw new Error("Adjustment not found");
      adjustment.status = "rejected";
      adjustment.rejectionReason = reason;
      return adjustment;
    },
    onSuccess: (_, { id }) => {
      const adjustment = mockAdjustments.find((a) => a.id === id);
      if (adjustment) {
        qc.invalidateQueries({ queryKey: walletsKeys.wallet(adjustment.userId) });
      }
      qc.invalidateQueries({ queryKey: walletsKeys.pendingAdjustments({}) });
    },
  });
}
