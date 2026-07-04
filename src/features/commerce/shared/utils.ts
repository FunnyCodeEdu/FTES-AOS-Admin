export function formatVND(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function parseMoneyInput(value: string): number | null {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  return Number(digits);
}

export function formatMoneyInput(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return "";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(amount);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
