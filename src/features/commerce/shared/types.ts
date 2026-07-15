// Shared commerce domain types. API shapes are assumptions per design.md.

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
}

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "completed"
  | "cancelled"
  | "refunded";

export interface OrderItem {
  id: string;
  productName: string;
  productType: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PaymentTimelineEvent {
  event: "created" | "webhook_received" | "matched" | "completed" | "failed";
  occurredAt: string;
  note?: string;
  actorName?: string;
}

export interface Order {
  id: string;
  code: string;
  buyerEmail: string;
  buyerName?: string;
  status: OrderStatus;
  totalAmount: number;
  paidAmount: number;
  currency: string;
  items: OrderItem[];
  paymentTimeline: PaymentTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export type PaymentMatchStatus = "matched" | "unmatched" | "duplicate";

export interface Payment {
  id: string;
  transactionCode: string;
  amount: number;
  currency: string;
  matchStatus: PaymentMatchStatus;
  orderId?: string;
  orderCode?: string;
  receivedAt: string;
  bankName?: string;
}

export interface ReconciliationSummary {
  matched: number;
  mismatched: number;
  missing: number;
}

export type ReconciliationRowStatus =
  | "webhook_unmatched"
  | "order_missing_payment"
  | "duplicate_webhook"
  | "resolved";

export interface ReconciliationRow {
  id: string;
  status: ReconciliationRowStatus;
  amount: number;
  currency: string;
  orderId?: string;
  orderCode?: string;
  paymentId?: string;
  transactionCode?: string;
  occurredAt: string;
  note?: string;
}

export interface ReconciliationReport {
  dateFrom: string;
  dateTo: string;
  summary: ReconciliationSummary;
  rows: ReconciliationRow[];
}

export type RefundStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "executed"
  | "execution_failed";

export interface RefundTimelineItem {
  step: RefundStatus | "retry";
  actorId: string;
  actorName: string;
  occurredAt: string;
  reason?: string;
  note?: string;
  payoutChannel?: "bank" | "wallet";
  errorMessage?: string;
}

export interface Refund {
  id: string;
  orderId: string;
  orderCode: string;
  amount: number;
  currency: string;
  reason: string;
  status: RefundStatus;
  createdBy: string;
  createdByName: string;
  approvedBy?: string;
  approvedByName?: string;
  executedBy?: string;
  executedByName?: string;
  payoutChannel?: "bank" | "wallet";
  timeline: RefundTimelineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  userId: string;
  userName: string;
  userEmail: string;
  balance: number;
  currency: string;
  status: "active" | "frozen";
}

export type WalletTransactionType =
  | "deposit"
  | "payment"
  | "refund"
  | "adjustment"
  | "withdrawal";

export interface WalletTransaction {
  id: string;
  type: WalletTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  currency: string;
  reason?: string;
  actorId?: string;
  actorName?: string;
  createdAt: string;
}

export type WalletAdjustmentStatus =
  | "applied"
  | "pending_approval"
  | "rejected";

export interface WalletAdjustment {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  currency: string;
  reason: string;
  status: WalletAdjustmentStatus;
  createdBy: string;
  createdByName: string;
  approvedBy?: string;
  approvedByName?: string;
  rejectionReason?: string;
  createdAt: string;
}

export type CouponType = "percent" | "fixed";
export type CouponStatus = "active" | "inactive" | "expired";

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  maxUses?: number;
  usedCount: number;
  perUserLimit?: number;
  validFrom?: string;
  validTo?: string;
  appliesTo: string[];
  status: CouponStatus;
  disabledReason?: string;
}

export interface CouponStats {
  uses: number;
  uniqueUsers: number;
  revenueImpact: number;
  usageByDay: { date: string; count: number }[];
}

export type ProductType =
  | "merchandise"
  | "premium"
  | "ai_credits"
  | "voucher"
  | "course_unlock";

export type ProductStatus = "active" | "inactive" | "draft";

export interface Product {
  id: string;
  name: string;
  /** Slug BE (@NotBlank khi upsert) — giữ để update không sinh lại slug từ tên. */
  slug?: string;
  type: ProductType;
  status: ProductStatus;
  basePrice: number;
  currency: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

// Khớp miền BE FulfillmentStatus {PENDING, DONE, FAILED} — BE không mô hình hoá packed/shipped.
export type FulfillmentStatus =
  | "pending"   // PENDING
  | "delivered" // DONE
  | "failed";   // FAILED

export interface Fulfillment {
  id: string;
  orderId: string;
  orderCode: string;
  productName: string;
  recipientName: string;
  recipientPhone?: string;
  address?: string;
  status: FulfillmentStatus;
  trackingCode?: string;
  updatedAt: string;
}

export interface RevenueByProductType {
  productType: string;
  amount: number;
}

export interface RevenueSummary {
  today: number;
  last7d: number;
  last30d: number;
  byProductType: RevenueByProductType[];
}

export interface CommerceConfig {
  walletAdjustDualApprovalThreshold: number;
  currency: string;
}
