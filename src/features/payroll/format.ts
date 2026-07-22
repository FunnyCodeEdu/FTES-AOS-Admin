import type { EarningStatus } from "./types";

const VND = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

export function formatVnd(value: number | null | undefined): string {
  return VND.format(Number(value ?? 0));
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("vi-VN");
}

/** Màu Tag AntD theo trạng thái kỳ lương. */
export function statusTagColor(status: EarningStatus): string {
  switch (status) {
    case "OPEN":
      return "processing";
    case "PENDING":
      return "warning";
    case "CLOSE":
      return "success";
    default:
      return "default";
  }
}

export const STATUS_LABEL: Record<EarningStatus, string> = {
  OPEN: "Đang mở",
  PENDING: "Chờ duyệt",
  CLOSE: "Đã chốt",
};

export const STATUS_OPTIONS: { value: EarningStatus; label: string }[] = [
  { value: "OPEN", label: "OPEN" },
  { value: "PENDING", label: "PENDING" },
  { value: "CLOSE", label: "CLOSE" },
];

/**
 * Transition hợp lệ TỪ admin console. Vòng đời đầy đủ là OPEN → PENDING → CLOSE, nhưng
 * OPEN → PENDING là hành động "yêu cầu chi trả" của chính giảng viên (trang Lương của tôi),
 * KHÔNG phải việc của admin. Admin chỉ duyệt chi trả: PENDING → CLOSE (mark-paid) — nên
 * console không mở affordance OPEN → PENDING (BE sẽ từ chối bằng PAYROLL_INVALID_STATUS).
 */
const ADMIN_STATUS_FLOW: Record<EarningStatus, EarningStatus[]> = {
  OPEN: [],
  PENDING: ["CLOSE"],
  CLOSE: [],
};

/**
 * Options cho Select đổi trạng thái ở admin console: chỉ gồm trạng thái hiện tại (để render
 * label) và bước kế hợp lệ cho admin. Chặn transition mà BE sẽ từ chối (PAYROLL_INVALID_STATUS).
 */
export function statusOptionsFor(
  current: EarningStatus
): { value: EarningStatus; label: string }[] {
  return STATUS_OPTIONS.filter(
    (o) => o.value === current || ADMIN_STATUS_FLOW[current].includes(o.value)
  );
}
