export type EarningStatus = "OPEN" | "PENDING" | "CLOSE";

export interface PayrollDeduction {
  id: string;
  type: string;
  amount: number;
  description?: string;
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
