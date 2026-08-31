import type { ClipStatus, HighlightJobStatus } from "./types";

/** Nhãn tiếng Việt cho trạng thái clip (giá trị enum của BE giữ nguyên UPPERCASE). */
export const CLIP_STATUS_LABEL: Record<ClipStatus, string> = {
  QUEUED: "Chờ cắt",
  RENDERING: "Đang cắt",
  READY: "Sẵn sàng",
  FAILED: "Hỏng",
};

export const CLIP_STATUS_OPTIONS: { value: ClipStatus; label: string }[] = (
  ["QUEUED", "RENDERING", "READY", "FAILED"] as ClipStatus[]
).map((value) => ({ value, label: CLIP_STATUS_LABEL[value] }));

export function clipStatusColor(status: ClipStatus): string {
  switch (status) {
    case "READY":
      return "success";
    case "RENDERING":
      return "processing";
    case "QUEUED":
      return "default";
    case "FAILED":
      return "error";
    default:
      return "default";
  }
}

export const HIGHLIGHT_JOB_STATUS_LABEL: Record<HighlightJobStatus, string> = {
  RUNNING: "AI đang đọc transcript",
  READY: "Đã có đề xuất",
  FAILED: "Không đề xuất được",
};

/** Ngày giờ ngắn gọn cho bảng Studio (mirror `payroll/format.formatDate`). */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("vi-VN");
}
