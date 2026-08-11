import { describe, expect, it } from "vitest";
import { normalizeImportResult, previewSnippet } from "./TestCaseZipImport";

// challenge-testcase-editor §3 — chuẩn hoá kết quả import ZIP (contract BE §3.2).

describe("normalizeImportResult", () => {
  it("dạng chuẩn {imported: number, skipped:[{entry,reason}]}", () => {
    expect(
      normalizeImportResult({
        imported: 12,
        skipped: [{ entry: "input/input07.txt", reason: "Thiếu file output tương ứng" }],
      })
    ).toEqual({
      imported: 12,
      skipped: [{ entry: "input/input07.txt", reason: "Thiếu file output tương ứng" }],
    });
  });

  // Hình dạng THẬT của BE: `ImportResult{imported:int, skipped, testCases}` — có CẢ số lẫn mảng.
  // Nếu chỉ đọc `testCases` khi `imported` không phải số thì bảng xem trước không bao giờ hiện.
  it("BE thật: imported là SỐ + testCases là MẢNG → vẫn dựng được preview", () => {
    const res = normalizeImportResult({
      imported: 2,
      skipped: [],
      testCases: [
        { id: "tc-1", name: "T1", input: "1", expectedOutput: "1", orderNo: 0 },
        { id: "tc-2", name: "T2", input: "2", expectedOutput: "4", orderNo: 1 },
      ],
    });
    expect(res.imported).toBe(2);
    expect(res.cases).toHaveLength(2);
    expect(res.cases?.[0].name).toBe("T1");
  });

  it("BE thật: imported (số) là NGUỒN SỰ THẬT của bộ đếm, kể cả khi lệch độ dài testCases", () => {
    const res = normalizeImportResult({
      imported: 5,
      skipped: [],
      testCases: [{ name: "T1", input: "1", expectedOutput: "1" }],
    });
    expect(res.imported).toBe(5);
    expect(res.cases).toHaveLength(1);
  });

  it("imported = 0 nhưng testCases rỗng → không có preview, không nổ", () => {
    const res = normalizeImportResult({ imported: 0, skipped: [], testCases: [] });
    expect(res.imported).toBe(0);
    expect(res.cases).toEqual([]);
  });

  it("chỉ có testCases (thiếu imported số) → imported = độ dài mảng", () => {
    const res = normalizeImportResult({
      testCases: [{ name: "T1" }, { name: "T2" }, { name: "T3" }],
    });
    expect(res.imported).toBe(3);
    expect(res.cases).toHaveLength(3);
  });

  it("BE trả thẳng MẢNG case ở `imported` → dùng làm preview, imported = độ dài", () => {
    const res = normalizeImportResult({
      imported: [
        { name: "T1", input: "1", expectedOutput: "1" },
        { name: "T2", input: "2", expectedOutput: "4" },
      ],
      skipped: [],
    });
    expect(res.imported).toBe(2);
    expect(res.cases).toHaveLength(2);
  });

  it("skipped là mảng chuỗi → vá lý do mặc định", () => {
    const res = normalizeImportResult({ imported: 0, skipped: ["readme.txt"] });
    expect(res.skipped).toEqual([
      { entry: "readme.txt", reason: "Không ghép được cặp input/output" },
    ]);
  });

  it("payload rỗng / lạ → 0 case, không skip (không nổ runtime)", () => {
    expect(normalizeImportResult(null)).toEqual({ imported: 0, skipped: [] });
    expect(normalizeImportResult("oops")).toEqual({ imported: 0, skipped: [] });
    expect(normalizeImportResult({})).toEqual({ imported: 0, skipped: [] });
  });

  it("entry/reason thiếu hoặc sai kiểu → nhãn thay thế thay vì undefined trên UI", () => {
    const res = normalizeImportResult({ imported: 1, skipped: [{ reason: 42 }] });
    expect(res.skipped).toEqual([{ entry: "(entry 1)", reason: "Không rõ lý do" }]);
  });

  it("imported âm / không phải số nguyên → chuẩn hoá về số nguyên không âm", () => {
    expect(normalizeImportResult({ imported: -3 }).imported).toBe(0);
    expect(normalizeImportResult({ imported: 4.9 }).imported).toBe(4);
  });
});

describe("previewSnippet", () => {
  it("đổi xuống dòng thành ⏎ và cắt ngắn", () => {
    expect(previewSnippet("a\nb")).toBe("a⏎b");
    expect(previewSnippet("x".repeat(80))).toBe(`${"x".repeat(60)}…`);
  });

  it("rỗng / vắng → dấu gạch", () => {
    expect(previewSnippet("")).toBe("—");
    expect(previewSnippet(null)).toBe("—");
  });
});
