import { Tag } from "antd";
import type { RefundStatus } from "../../shared/types";

const LABELS: Record<RefundStatus, string> = {
  requested: "Đã yêu cầu",
  approved: "Đã duyệt",
  rejected: "Đã từ chối",
  executed: "Đã thực thi",
  execution_failed: "Thực thi lỗi",
};

const COLORS: Record<RefundStatus, string> = {
  requested: "warning",
  approved: "processing",
  rejected: "default",
  executed: "success",
  execution_failed: "error",
};

export function RefundStatusBadge({ status }: { status: RefundStatus }) {
  const key = (status ?? "").toString().toLowerCase() as RefundStatus;
  const color = COLORS[status] ?? COLORS[key] ?? "default";
  const label = LABELS[status] ?? LABELS[key] ?? String(status ?? "");
  return <Tag color={color}>{label}</Tag>;
}
