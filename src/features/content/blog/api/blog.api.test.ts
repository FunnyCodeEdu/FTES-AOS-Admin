import { describe, expect, it } from "vitest";
import { buildPostListQuery, computePostListTotal } from "./blog.api";
import type { BlogPostListParams } from "../types";

// Task 1 — posts-list-real-params: total thật + filter published server-side.

describe("computePostListTotal", () => {
  it("ưu tiên totalElements khi BE trả field (nguồn thật)", () => {
    // page 2, size 10, tải 7 dòng nhưng BE nói tổng thật = 42 → dùng 42, không suy heuristic.
    expect(computePostListTotal(2, 10, 7, { hasNext: true, totalElements: 42 })).toBe(42);
  });

  it("totalElements = 0 vẫn là số hợp lệ (không rơi xuống fallback)", () => {
    expect(computePostListTotal(1, 10, 0, { hasNext: false, totalElements: 0 })).toBe(0);
  });

  it("totalElements null → fallback heuristic hasNext", () => {
    // page 1, size 10, còn trang sau → đẩy total vượt trang để antd bật nút next.
    expect(computePostListTotal(1, 10, 10, { hasNext: true, totalElements: null })).toBe(11);
  });

  it("vắng field totalElements + hasNext=true → total = page*size + 1", () => {
    expect(computePostListTotal(3, 10, 10, { hasNext: true })).toBe(31);
  });

  it("vắng field totalElements + hasNext=false → total = số dòng đã tải tới trang này", () => {
    // page 3, size 10, trang cuối có 4 dòng → 2 trang đầy + 4 = 24.
    expect(computePostListTotal(3, 10, 4, { hasNext: false })).toBe(24);
  });
});

describe("buildPostListQuery — published server-side, 3 trạng thái", () => {
  const base: BlogPostListParams = { page: 1, pageSize: 10 };

  it("published=true đi thẳng lên params", () => {
    expect(buildPostListQuery({ ...base, published: true })).toMatchObject({ published: true });
  });

  it("published=false đi thẳng lên params (không bị coi là 'tất cả')", () => {
    expect(buildPostListQuery({ ...base, published: false })).toMatchObject({ published: false });
  });

  it("published=undefined → param undefined (axios bỏ ⇒ lấy tất cả)", () => {
    expect(buildPostListQuery(base).published).toBeUndefined();
  });

  it("page 1-based UI → 0-based BE, size giữ nguyên", () => {
    expect(buildPostListQuery({ ...base, page: 3, pageSize: 20 })).toMatchObject({ page: 2, size: 20 });
  });

  it("page 1 không rơi xuống âm", () => {
    expect(buildPostListQuery({ ...base, page: 1 }).page).toBe(0);
  });
});
