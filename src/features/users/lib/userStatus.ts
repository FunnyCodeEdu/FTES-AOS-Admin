export const USER_STATUS_OPTIONS = [
  { label: "Đang hoạt động", value: "active" },
  { label: "Đã khoá", value: "locked" },
  { label: "Chờ xác nhận", value: "pending" },
  { label: "Đã vô hiệu hoá", value: "disabled" },
] as const;

type KnownUserStatus = (typeof USER_STATUS_OPTIONS)[number]["value"];

const UI_TO_BACKEND_STATUS: Record<KnownUserStatus, string> = {
  active: "ACTIVE",
  locked: "LOCKED",
  pending: "PENDING_VERIFICATION",
  disabled: "DISABLED",
};

const BACKEND_TO_UI_STATUS: Record<string, KnownUserStatus> = {
  ACTIVE: "active",
  LOCKED: "locked",
  PENDING: "pending",
  PENDING_VERIFICATION: "pending",
  DISABLED: "disabled",
};

const USER_STATUS_META: Record<KnownUserStatus, { color: string; label: string }> = {
  active: { color: "green", label: "Đang hoạt động" },
  locked: { color: "red", label: "Đã khoá" },
  pending: { color: "orange", label: "Chờ xác nhận" },
  disabled: { color: "default", label: "Đã vô hiệu hoá" },
};

export function toBackendUserStatus(status: string | undefined): string | undefined {
  const normalized = status?.trim();
  if (!normalized) return undefined;

  const uiStatus = normalized.toLowerCase() as KnownUserStatus;
  return UI_TO_BACKEND_STATUS[uiStatus] ?? normalized.toUpperCase();
}

export function fromBackendUserStatus(status: string): string {
  const normalized = status.trim().toUpperCase();
  return BACKEND_TO_UI_STATUS[normalized] ?? status.trim().toLowerCase();
}

export function getUserStatusMeta(status: string): { color: string; label: string } {
  const normalized = fromBackendUserStatus(status) as KnownUserStatus;
  return USER_STATUS_META[normalized] ?? { color: "default", label: status.trim() || "—" };
}
