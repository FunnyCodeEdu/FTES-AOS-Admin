import { Tag } from "antd";
import type { TermStatus } from "../../types";

const TERM_STATUS_META: Record<TermStatus, { text: string; color: string }> = {
  SCHEDULED: { text: "Sắp diễn ra", color: "blue" },
  ACTIVE: { text: "Đang diễn ra", color: "green" },
  ENDED: { text: "Đã kết thúc", color: "default" },
};

/** Tag trạng thái kỳ dùng chung cho bảng danh sách và header chi tiết. */
export function TermStatusTag({ status }: { status: TermStatus }) {
  const meta = TERM_STATUS_META[status] ?? { text: String(status ?? ""), color: "default" };
  return <Tag color={meta.color}>{meta.text}</Tag>;
}
