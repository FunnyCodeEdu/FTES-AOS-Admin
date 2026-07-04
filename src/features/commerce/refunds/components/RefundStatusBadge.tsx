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
  return <Tag color={COLORS[status]}>{LABELS[status]}</Tag>;
}
