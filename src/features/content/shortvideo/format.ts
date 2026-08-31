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

/**
 * Số giờ một tin còn hiện trên mục Tin, tính từ lúc đăng. Phải khớp `StoryService.VISIBLE_WINDOW`
 * bên FTES-AOS-Community — đó mới là nơi QUYẾT ĐỊNH; con số ở đây chỉ để nói lại cho admin biết.
 */
export const STORY_VISIBLE_HOURS = 24;

/** Tin đang ở đâu trong vòng đời hiển thị của nó. */
export type StoryVisibility = "NONE" | "LIVE" | "EXPIRED";

/**
 * Clip này còn hiện trên mục Tin không.
 *
 * <p>Có `publishedStoryId` KHÔNG còn đồng nghĩa với "người học đang thấy": cộng đồng chỉ trả tin
 * đăng trong {@link STORY_VISIBLE_HOURS} giờ gần nhất. Không phân biệt hai trạng thái này thì Studio
 * báo "Đang trên mục Tin" vĩnh viễn cho một tin không ai còn thấy — admin đi hỏi vì sao clip không
 * hiện, trong khi hệ thống đang chạy đúng.
 *
 * <p>Mốc lấy từ `publishedAt` của backend. Thiếu mốc (dữ liệu cũ, hoặc backend chưa kịp ghi) thì
 * coi như CÒN HIỆN: thà nói thiếu một cảnh báo còn hơn dán nhãn "hết hạn" lên một tin vẫn đang chạy.
 */
export function storyVisibility(clip: {
  publishedStoryId?: string | null;
  publishedAt?: string | null;
}): StoryVisibility {
  if (!clip.publishedStoryId) return "NONE";
  if (!clip.publishedAt) return "LIVE";
  const publishedAt = new Date(clip.publishedAt).getTime();
  if (Number.isNaN(publishedAt)) return "LIVE";
  return Date.now() - publishedAt >= STORY_VISIBLE_HOURS * 3_600_000 ? "EXPIRED" : "LIVE";
}
