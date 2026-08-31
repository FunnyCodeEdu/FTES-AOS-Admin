import type { Clip, ClipListResult } from "../types";

/**
 * Đọc trang clip mà BE trả về, chịu được CẢ BA hình dạng đang tồn tại trong repo này:
 * mảng trần, `{items,total}` (kiểu GraphQL adminCourses), và `{content,totalElements}`
 * (kiểu Spring `Page`, mà commerce/blog đang gặp).
 *
 * Vì sao phải chịu cả ba: module BE `shortvideo` đang được viết SONG SONG ở phiên khác và hợp
 * đồng chung chỉ chốt đường dẫn + tham số, KHÔNG chốt vỏ phân trang. Chọn cứng một dạng rồi đoán
 * sai thì bảng Studio rỗng trắng mà không có lỗi nào — kiểu hỏng khó lần nhất. Nhận cả ba là rẻ
 * và không che giấu điều gì.
 *
 * @param page trang ĐANG xem, đếm từ 1 như UI (chỉ dùng khi BE không trả tổng thật).
 */
export function normalizeClipPage(
  raw: unknown,
  page: number,
  pageSize: number
): ClipListResult {
  if (Array.isArray(raw)) {
    return { items: raw as Clip[], total: raw.length };
  }
  if (!raw || typeof raw !== "object") {
    return { items: [], total: 0 };
  }
  const body = raw as Record<string, unknown>;
  const rows = (Array.isArray(body.items)
    ? body.items
    : Array.isArray(body.content)
      ? body.content
      : []) as Clip[];

  if (typeof body.total === "number") return { items: rows, total: body.total };
  if (typeof body.totalElements === "number") return { items: rows, total: body.totalElements };

  // Không có tổng thật: suy như `computePostListTotal` của blog — trang đầy thì đẩy tổng vượt
  // trang hiện tại để antd còn bật nút next, trang vơi thì tổng = số dòng đã đi qua tới đây.
  const consumed = Math.max(0, page - 1) * pageSize;
  const total = rows.length >= pageSize ? consumed + pageSize + 1 : consumed + rows.length;
  return { items: rows, total };
}
