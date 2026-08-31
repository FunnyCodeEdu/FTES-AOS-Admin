import { describe, expect, it } from "vitest";
import { normalizeClipPage } from "./clipPage";
import { buildClipListQuery } from "./shortvideo.api";

// change admin-shortvideo-studio — đọc trang clip khi vỏ phân trang của BE chưa chốt.

describe("normalizeClipPage", () => {
  it("mảng trần: tổng = số dòng", () => {
    expect(normalizeClipPage([{ id: "a" }, { id: "b" }], 1, 10)).toMatchObject({ total: 2 });
  });

  it("{items,total} — dùng tổng thật của BE", () => {
    const out = normalizeClipPage({ items: [{ id: "a" }], total: 42 }, 1, 10);
    expect(out.items).toHaveLength(1);
    expect(out.total).toBe(42);
  });

  it("{content,totalElements} kiểu Spring Page cũng đọc được", () => {
    const out = normalizeClipPage({ content: [{ id: "a" }], totalElements: 7 }, 1, 10);
    expect(out.items).toHaveLength(1);
    expect(out.total).toBe(7);
  });

  it("total = 0 là số hợp lệ, không rơi xuống suy đoán", () => {
    expect(normalizeClipPage({ items: [], total: 0 }, 1, 10).total).toBe(0);
  });

  it("thiếu tổng, trang đầy → đẩy tổng vượt trang để còn bấm được next", () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }));
    expect(normalizeClipPage({ items: rows }, 2, 10).total).toBe(21);
  });

  it("thiếu tổng, trang vơi → tổng = số dòng đã đi qua tới đây", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(normalizeClipPage({ items: rows }, 3, 10).total).toBe(23);
  });

  it("payload lạ (null / chuỗi) không làm vỡ bảng", () => {
    expect(normalizeClipPage(null, 1, 10)).toEqual({ items: [], total: 0 });
    expect(normalizeClipPage("oops", 1, 10)).toEqual({ items: [], total: 0 });
  });
});

describe("buildClipListQuery", () => {
  it("trang của UI đếm từ 1, của BE đếm từ 0", () => {
    expect(buildClipListQuery({ page: 3, pageSize: 20 })).toMatchObject({ page: 2, size: 20 });
  });

  it("trang 1 không rơi xuống âm", () => {
    expect(buildClipListQuery({ page: 1, pageSize: 10 }).page).toBe(0);
  });

  it("bộ lọc rỗng đi ra undefined (axios bỏ hẳn param ⇒ lấy tất cả)", () => {
    const q = buildClipListQuery({ page: 1, pageSize: 10 });
    expect(q.status).toBeUndefined();
    expect(q.courseId).toBeUndefined();
  });
});
