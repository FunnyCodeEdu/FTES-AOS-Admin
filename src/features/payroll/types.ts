export type EarningStatus = "OPEN" | "PENDING" | "CLOSE";

export interface PayrollDeduction {
  id: string;
  type: string;
  amount: number;
  description?: string;
}

export interface PayrollOrderContribution {
  orderId: string;
  orderStatus?: string | null;
  orderCreatedAt?: string | null;
  paidAmount?: number | null;
  studentId?: string | null;
  studentName?: string | null;
  studentEmail?: string | null;
  items: PayrollOrderContributionItem[];
  commissionBasisType: "NET_CASH_AFTER_DISCOUNTS" | string;
  commissionBasis: number;
  commissionRatePercent: number;
  instructorContribution: number;
  effectiveContribution: number;
  accruedAt: string;
  reversedAt: string | null;
}

export interface PayrollOrderContributionItem {
  courseId: string;
  courseName?: string | null;
  packageId?: string | null;
  packageName?: string | null;
  grossAmount: number;
}

export interface PayrollOrderContributionTotals {
  orderCount: number;
  orderPaidTotal: number;
  commissionBasisTotal: number;
  originalContributionTotal: number;
  reversedContributionTotal: number;
  activeContributionTotal: number;
  payrollGrossRevenue: number;
  ledgerVariance: number;
  ledgerBalanced: boolean;
}

/**
 * Bảng lương một kỳ (batch) của một giảng viên — theo payroll DTO của BE
 * (`GET /api/v1/payroll/admin/earnings`). Mỗi giảng viên lazily có ≥1 batch OPEN.
 */
export interface Earning {
  id: string;
  instructorId: string;
  instructorName: string;
  grossRevenue: number;
  allowance: number;
  totalDeduction: number;
  netPayable: number;
  status: EarningStatus;
  deductions: PayrollDeduction[];
  orderContributions: PayrollOrderContribution[];
  orderContributionTotals?: PayrollOrderContributionTotals | null;
  createdAt: string;
  paidAt: string | null;
  active: boolean;
}

/** Tham số lọc danh sách lương — lọc client-side (BE trả toàn bộ Earning[]). */
export interface PayrollListParams {
  q?: string;
  status?: EarningStatus;
}

/** Body thêm/sửa khoản trừ. */
export interface DeductionInput {
  type: string;
  amount: number;
  description?: string;
}
