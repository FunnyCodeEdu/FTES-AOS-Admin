import type { QuestionItemStatus, QuestionItemView } from "./types";

/** Nhịp poll detail khi còn item PENDING (ms). */
export const QUESTION_ITEM_POLL_INTERVAL_MS = 3000;

/**
 * Sau mốc này mà kho vẫn còn item PENDING thì đổi copy "vẫn đang xử lý…" (stale) — CHỈ để đổi
 * chữ, KHÔNG dừng poll (ý tưởng `AI_JOB_STALE_MS` của `useAiJobPolling`).
 */
export const QUESTION_ITEM_STALE_MS = 90_000;

/** Nhãn tiếng Việt cho trạng thái item. */
export const STATUS_LABEL: Record<QuestionItemStatus, string> = {
  PENDING: "Đang xử lý",
  SOLVED: "Đã giải",
  FAILED: "Lỗi",
};

/** Màu Tag AntD theo trạng thái item. */
export const STATUS_COLOR: Record<QuestionItemStatus, string> = {
  PENDING: "orange",
  SOLVED: "green",
  FAILED: "red",
};

/**
 * Predicate poll (pure — unit-testable): còn ít nhất 1 item PENDING → phải tiếp tục poll.
 * Dùng trong `refetchInterval` của `useQuestionBankDetail`.
 */
export function hasPendingItems(items: QuestionItemView[] | undefined): boolean {
  return !!items && items.some((i) => i.status === "PENDING");
}

/** Số item còn PENDING (để hiện "đang xử lý N ảnh…"). */
export function pendingCount(items: QuestionItemView[] | undefined): number {
  return items ? items.filter((i) => i.status === "PENDING").length : 0;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("vi-VN");
}
