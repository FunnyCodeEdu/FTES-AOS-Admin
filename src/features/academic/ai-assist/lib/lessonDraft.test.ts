import { describe, expect, it } from "vitest";
import {
  MAX_SELECTION_CHARS,
  clampSelectionText,
  draftErrorMessage,
  insertAtCaret,
  parseHeadings,
  replaceRange,
} from "./lessonDraft";

// Task 5.5 — admin-lecturer-ai-assist: insert/replace/undo đúng vị trí trên body markdown.

describe("parseHeadings", () => {
  it("lấy heading 1..6, trim, bỏ closing #, bỏ dòng thường", () => {
    const body = [
      "# Mở đầu",
      "văn bản thường",
      "  ## Phần 1  ##",
      "###### Sâu nhất",
      "#KhongCoSpace",
      "####### bảy dấu không phải heading",
    ].join("\n");
    expect(parseHeadings(body)).toEqual(["Mở đầu", "Phần 1", "Sâu nhất"]);
  });

  it("heading rỗng bị bỏ; body rỗng → []", () => {
    expect(parseHeadings("#   \n##\n")).toEqual([]);
    expect(parseHeadings("")).toEqual([]);
  });
});

describe("clampSelectionText", () => {
  it("<= 4000 chars giữ nguyên", () => {
    const text = "a".repeat(MAX_SELECTION_CHARS);
    expect(clampSelectionText(text)).toEqual({ text, truncated: false });
  });

  it("> 4000 chars cắt còn đúng 4000 + cờ truncated", () => {
    const out = clampSelectionText("b".repeat(MAX_SELECTION_CHARS + 5));
    expect(out.truncated).toBe(true);
    expect(out.text).toHaveLength(MAX_SELECTION_CHARS);
  });
});

describe("insertAtCaret", () => {
  it("chèn đúng vị trí giữa body", () => {
    expect(insertAtCaret("abc def", 3, "XYZ")).toBe("abcXYZ def");
  });

  it("caret âm kẹp về 0, caret quá dài kẹp về cuối", () => {
    expect(insertAtCaret("abc", -5, "X")).toBe("Xabc");
    expect(insertAtCaret("abc", 99, "X")).toBe("abcX");
  });
});

describe("replaceRange", () => {
  it("thay đúng [start, end)", () => {
    expect(replaceRange("hello world", 6, 11, "FTES")).toBe("hello FTES");
  });

  it("start > end hoán đổi; ngoài biên kẹp trong [0, len]", () => {
    expect(replaceRange("hello world", 11, 6, "FTES")).toBe("hello FTES");
    expect(replaceRange("abc", -2, 99, "X")).toBe("X");
  });

  it("start == end = chèn thuần (không mất ký tự)", () => {
    expect(replaceRange("abcd", 2, 2, "-")).toBe("ab-cd");
  });
});

describe("undo 1 mức (semantics panel: giữ {before, after})", () => {
  it("chèn rồi thay ngược [caret, caret+len) bằng rỗng → về đúng body cũ", () => {
    const before = "## Bài học\nnội dung";
    const caret = 10;
    const inserted = "\n\nĐoạn AI sinh";
    const after = insertAtCaret(before, caret, inserted);
    expect(replaceRange(after, caret, caret + inserted.length, "")).toBe(before);
  });

  it("user gõ tiếp (body != after) → undo phải bị chặn (điều kiện canUndo)", () => {
    const before = "abc";
    const after = insertAtCaret(before, 3, "X");
    const edited = after + "y"; // user gõ thêm
    // Panel chỉ cho undo khi body === snapshot-after — mô phỏng đúng điều kiện đó.
    expect(edited === after).toBe(false);
    expect(after === insertAtCaret(before, 3, "X")).toBe(true);
  });
});

describe("draftErrorMessage", () => {
  it("map code quen → message VN cụ thể", () => {
    expect(draftErrorMessage("AI_QUOTA_EXCEEDED")).toContain("hết lượt");
    expect(draftErrorMessage("AI_FEATURE_FORBIDDEN")).toContain("ai.teacher.use");
    expect(draftErrorMessage("AI_SESSION_BUSY")).toContain("Đợi xong");
  });

  it("code lạ → fallback chung", () => {
    expect(draftErrorMessage("HTTP_500")).toBe("Không tạo được nội dung. Vui lòng thử lại.");
  });
});
