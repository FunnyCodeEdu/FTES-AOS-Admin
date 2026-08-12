import type { BankSearchParams, ReviewQueueParams } from "../types";

/**
 * Hàm THUẦN dựng query string cho `GET /admin/challenges/bank` (change admin-challenge-bank-console).
 *
 * Ba điểm dễ sai, nên tách ra khỏi hook để có unit test:
 *
 *  1. **`page` của BE là 0-based** (`@RequestParam(required=false, defaultValue="0") int page`) còn
 *     `Table` của AntD đếm từ 1. Quên trừ ⇒ mở màn đã nhảy mất trang đầu.
 *  2. **Field rỗng phải BIẾN MẤT, không được gửi chuỗi rỗng**: `status=""` là một bộ lọc THẬT ở BE
 *     (so khớp status rỗng → không dòng nào) chứ không phải "bỏ lọc".
 *  3. **`onlyUnattached`/`free` là ba trạng thái**: `undefined` = không lọc, `false` = lọc "không".
 *     `onlyUnattached=false` gửi đi vô hại (BE default false) nhưng bỏ đi thì URL sạch hơn và cache
 *     key ổn định hơn.
 *
 * `tags` giữ nguyên dạng MẢNG — nhưng CHÚ Ý: mặc định axios serialize mảng thành `tags[]=a&tags[]=b`
 * (option `indexes: false`), mà Spring `@RequestParam List<String> tags` chỉ đọc tham số tên đúng
 * `tags`. Nơi gọi vì thế PHẢI đặt `paramsSerializer: { indexes: null }` (xem `useChallengeBank`) để
 * ra `tags=a&tags=b`. BE khớp theo GIAO nên nhiều tag = lọc hẹp dần.
 */
export function buildBankQueryParams(params: BankSearchParams): Record<string, unknown> {
  const out: Record<string, unknown> = {
    page: Math.max(0, (params.page || 1) - 1),
    size: params.pageSize,
  };

  const q = params.q?.trim();
  if (q) out.q = q;

  const tags = (params.tags ?? []).map((t) => t.trim()).filter(Boolean);
  if (tags.length > 0) out.tags = tags;

  if (params.type) out.type = params.type;
  if (params.difficulty) out.difficulty = params.difficulty;
  if (params.subjectId) out.subjectId = params.subjectId;
  if (params.courseId) out.courseId = params.courseId;
  if (params.status) out.status = params.status;
  if (typeof params.free === "boolean") out.free = params.free;
  if (params.onlyUnattached) out.onlyUnattached = true;

  return out;
}

/** Cùng luật 0-based cho hàng đợi duyệt (`GET /admin/challenges/review-queue`). */
export function buildReviewQueueParams(params: ReviewQueueParams): Record<string, unknown> {
  const out: Record<string, unknown> = {
    page: Math.max(0, (params.page || 1) - 1),
    size: params.pageSize,
  };
  if (params.subjectId) out.subjectId = params.subjectId;
  return out;
}

/**
 * Kho có đang bị lọc không — quyết định empty state nói "không khớp bộ lọc" hay "kho chưa có gì".
 * KHÔNG tính `page`/`pageSize`.
 */
export function hasActiveBankFilters(params: BankSearchParams): boolean {
  return Boolean(
    params.q?.trim() ||
      (params.tags ?? []).length > 0 ||
      params.type ||
      params.difficulty ||
      params.subjectId ||
      params.courseId ||
      params.status ||
      typeof params.free === "boolean" ||
      params.onlyUnattached
  );
}
