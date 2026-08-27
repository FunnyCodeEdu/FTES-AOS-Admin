import { describe, expect, it } from "vitest";

import {
  PAPER_PAGES_MAX,
  PAPER_PAGE_MAX_CHARS,
  insertPageAfter,
  isPaperPagesDirty,
  movePaperPage,
  normalizePagesForSave,
  pageSummary,
  removePageAt,
  toDraftPages,
  validateDraftPages,
} from "./paperPages";

/**
 * Unit — luật soạn ĐỀ DẠNG CHỮ (BE change `challenge-paper-text`, V388).
 *
 * Ba thứ được ghim ở đây vì chúng là LUẬT chứ không phải markup:
 *
 * 1. **Thứ tự LÀ nội dung.** Phần tử thứ i được lưu thành trang i+1, nên mọi phép biến đổi mảng
 *    (đổi chỗ, chèn, xoá) phải giữ đúng ý người soạn — sai một bậc là đề đảo trang trước mặt học viên.
 * 2. **Trang trắng bị BỎ, không bị từ chối.** Trình soạn nhiều trang luôn để lại ô rỗng ở cuối; bắt
 *    người soạn đi dọn thứ mà client dọn được là làm khó không vì lý do gì. Và vì thế con số "sẽ lưu
 *    N trang" phải đo TRÊN mảng đã dọn.
 * 3. **"Đã sửa gì chưa" không được nhạy với `\r` hay dòng trống.** Mở modal rồi đóng lại mà bị hỏi
 *    "bỏ thay đổi?" là màn hình nói dối.
 */

describe("toDraftPages", () => {
  it("sắp theo pageNo, không tin thứ tự mảng đến", () => {
    expect(
      toDraftPages([
        { id: "b", pageNo: 2, contentMarkdown: "hai" },
        { id: "a", pageNo: 1, contentMarkdown: "một" },
      ]),
    ).toEqual(["một", "hai"]);
  });

  it("bản chữ vắng / rỗng ⇒ mảng rỗng (đề chưa có bản chữ, KHÔNG phải lỗi)", () => {
    expect(toDraftPages(undefined)).toEqual([]);
    expect(toDraftPages(null)).toEqual([]);
    expect(toDraftPages([])).toEqual([]);
  });
});

describe("normalizePagesForSave", () => {
  it("bỏ trang trắng và cắt khoảng trắng hai đầu", () => {
    expect(normalizePagesForSave(["  Câu 1  ", "", "   ", "\n\n", "Câu 2"])).toEqual([
      "Câu 1",
      "Câu 2",
    ]);
  });

  it("chuẩn hoá \\r\\n về \\n — \\r lọt vào markdown là hỏng khối code", () => {
    expect(normalizePagesForSave(["a\r\nb\rc"])).toEqual(["a\nb\nc"]);
  });
});

describe("validateDraftPages", () => {
  it("đề bình thường thì không có vấn đề gì", () => {
    expect(validateDraftPages(["Câu 1", "Câu 2"])).toBeNull();
  });

  it("đếm trần TRÊN mảng đã dọn — 200 trang thật cộng ô rỗng vẫn hợp lệ", () => {
    const full = Array.from({ length: PAPER_PAGES_MAX }, (_, i) => `Trang ${i + 1}`);
    expect(validateDraftPages([...full, "", "   "])).toBeNull();
    expect(validateDraftPages([...full, "một trang nữa"])).toContain(String(PAPER_PAGES_MAX));
  });

  it("trang quá dài thì nói rõ trang THỨ MẤY, tính theo số trang sau khi dọn", () => {
    const huge = "x".repeat(PAPER_PAGE_MAX_CHARS + 1);
    // Ô rỗng ở giữa KHÔNG được tính vào số trang trong thông báo: người soạn sẽ đi tìm "Trang 2".
    expect(validateDraftPages(["Trang 1", "   ", huge])).toContain("Trang 2");
  });
});

describe("isPaperPagesDirty", () => {
  it("thêm / sửa / bớt trang là BẨN", () => {
    expect(isPaperPagesDirty(["a", "b"], ["a"])).toBe(true);
    expect(isPaperPagesDirty(["a", "B"], ["a", "b"])).toBe(true);
    expect(isPaperPagesDirty([], ["a"])).toBe(true);
  });

  it("đổi CHỖ hai trang là BẨN — thứ tự chính là nội dung", () => {
    expect(isPaperPagesDirty(["b", "a"], ["a", "b"])).toBe(true);
  });

  it("một ô rỗng, một dòng trống cuối trang hay \\r\\n KHÔNG làm bẩn", () => {
    expect(isPaperPagesDirty(["a", ""], ["a"])).toBe(false);
    expect(isPaperPagesDirty(["a\n\n"], ["a"])).toBe(false);
    expect(isPaperPagesDirty(["a\r\nb"], ["a\nb"])).toBe(false);
  });
});

describe("movePaperPage", () => {
  it("đổi chỗ lên/xuống một bậc", () => {
    const pages = ["a", "b", "c"];
    expect(movePaperPage(pages, 2, -1)).toEqual(["a", "c", "b"]);
    expect(movePaperPage(pages, 0, 1)).toEqual(["b", "a", "c"]);
    expect(movePaperPage(pages, 2, -1)).not.toBe(pages);
  });

  it("trả CHÍNH mảng cũ khi không đổi được ⇒ nơi gọi khỏi set state thừa", () => {
    const pages = ["a", "b", "c"];
    expect(movePaperPage(pages, 0, -1)).toBe(pages);
    expect(movePaperPage(pages, 2, 1)).toBe(pages);
    expect(movePaperPage(pages, 9, -1)).toBe(pages);
  });
});

describe("insertPageAfter / removePageAt", () => {
  it("chèn NGAY SAU trang đang soạn, không nối vào cuối", () => {
    expect(insertPageAfter(["a", "b", "c"], 0)).toEqual(["a", "", "b", "c"]);
  });

  it("index âm ⇒ chèn vào đầu (đề đang rỗng)", () => {
    expect(insertPageAfter([], -1)).toEqual([""]);
  });

  it("bỏ đúng một trang; index sai thì trả CHÍNH mảng cũ", () => {
    const pages = ["a", "b", "c"];
    expect(removePageAt(pages, 1)).toEqual(["a", "c"]);
    expect(removePageAt(pages, 9)).toBe(pages);
    expect(removePageAt(pages, -1)).toBe(pages);
  });
});

describe("pageSummary", () => {
  it("lấy dòng chữ THẬT đầu tiên, bỏ dấu tiêu đề markdown", () => {
    expect(pageSummary("# Phần I\n\nCâu 1: Tính tổng")).toBe("Phần I");
    expect(pageSummary("\n\n> Câu 1: Tính tổng")).toBe("Câu 1: Tính tổng");
  });

  it("trang trống nói thẳng là trống — người soát đề cần thấy nó để đi dọn", () => {
    expect(pageSummary("   \n\n")).toBe("(trang trống)");
  });

  it("cắt ngắn dòng dài", () => {
    expect(pageSummary("x".repeat(80), 10)).toBe(`${"x".repeat(10)}…`);
  });
});
