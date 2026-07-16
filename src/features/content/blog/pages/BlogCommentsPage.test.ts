import { describe, expect, it } from "vitest";
import {
  canGoNext,
  canGoPrev,
  clampCommentSize,
  formatCommentAuthor,
} from "./BlogCommentsPage";

// Task 3 — comment-moderation-screen: helper thuần cho fallback tác giả + biên phân trang.

describe("formatCommentAuthor", () => {
  it("có authorUsername → hiển thị tên, không phải id", () => {
    const r = formatCommentAuthor({ authorUsername: "haitth", userId: "u-1" });
    expect(r).toMatchObject({ label: "haitth", isId: false, full: "haitth" });
  });

  it("authorUsername null → fallback userId rút gọn 8 ký tự + Tooltip full", () => {
    const r = formatCommentAuthor({ authorUsername: null, userId: "0123456789abcdef" });
    expect(r.isId).toBe(true);
    expect(r.label).toBe("01234567…");
    expect(r.full).toBe("0123456789abcdef");
  });

  it("authorUsername rỗng/space → coi như thiếu, fallback id", () => {
    const r = formatCommentAuthor({ authorUsername: "   ", userId: "short" });
    expect(r).toMatchObject({ label: "short", isId: true });
  });

  it("userId ngắn (<=8) không cắt, không thêm ellipsis", () => {
    const r = formatCommentAuthor({ authorUsername: undefined, userId: "abc123" });
    expect(r.label).toBe("abc123");
  });
});

describe("canGoPrev / canGoNext — biên phân trang hasNext", () => {
  it("trang 0 không cho lùi", () => {
    expect(canGoPrev(0)).toBe(false);
  });

  it("trang > 0 cho lùi", () => {
    expect(canGoPrev(1)).toBe(true);
  });

  it("hasNext=true cho tiến", () => {
    expect(canGoNext(true)).toBe(true);
  });

  it("hasNext=false chặn tiến", () => {
    expect(canGoNext(false)).toBe(false);
  });

  it("hasNext undefined (chưa tải) chặn tiến", () => {
    expect(canGoNext(undefined)).toBe(false);
  });
});

describe("clampCommentSize — cap khớp BE MAX_SIZE=50", () => {
  it("giá trị hợp lệ giữ nguyên", () => {
    expect(clampCommentSize(20)).toBe(20);
  });

  it("vượt 50 bị ép về 50", () => {
    expect(clampCommentSize(100)).toBe(50);
  });

  it("< 1 hoặc NaN → default 20", () => {
    expect(clampCommentSize(0)).toBe(20);
    expect(clampCommentSize(Number.NaN)).toBe(20);
  });
});
