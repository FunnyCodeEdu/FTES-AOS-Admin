import { describe, expect, it } from "vitest";
import { formatBytes, PAPER_MAX_BYTES, validatePaperFile } from "./paperFile";

const file = (name: string, type: string, size: number) => ({ name, type, size });

describe("validatePaperFile", () => {
  it("nhận pdf/png/jpeg/webp trong giới hạn", () => {
    expect(validatePaperFile(file("de-pe.pdf", "application/pdf", 1024))).toBeNull();
    expect(validatePaperFile(file("de.png", "image/png", 1024))).toBeNull();
    expect(validatePaperFile(file("de.jpg", "image/jpeg", 1024))).toBeNull();
    expect(validatePaperFile(file("de.webp", "image/webp", 1024))).toBeNull();
  });

  it("từ chối định dạng khác và nói rõ định dạng nào được nhận", () => {
    const msg = validatePaperFile(file("de.docx", "application/msword", 1024));
    expect(msg).toContain("PDF");
    expect(msg).toContain("WebP");
  });

  it("MIME rỗng (Windows thiếu ánh xạ) thì xét theo ĐUÔI tệp", () => {
    expect(validatePaperFile(file("de.pdf", "", 1024))).toBeNull();
    expect(validatePaperFile(file("de.exe", "", 1024))).not.toBeNull();
  });

  it("từ chối tệp rỗng", () => {
    expect(validatePaperFile(file("de.pdf", "application/pdf", 0))).toContain("rỗng");
  });

  it("từ chối tệp vượt 25 MB và nêu cả cỡ tệp lẫn trần", () => {
    const msg = validatePaperFile(file("de.pdf", "application/pdf", PAPER_MAX_BYTES + 1));
    expect(msg).toContain("25.0 MB");
    expect(msg).toContain("vượt giới hạn");
  });

  it("đúng trần 25 MB thì vẫn nhận (biên là <=)", () => {
    expect(validatePaperFile(file("de.pdf", "application/pdf", PAPER_MAX_BYTES))).toBeNull();
  });
});

describe("formatBytes", () => {
  it("đổi đơn vị theo cỡ", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("giá trị vắng/không hợp lệ ra dấu gạch, không ra NaN", () => {
    expect(formatBytes(null)).toBe("—");
    expect(formatBytes(undefined)).toBe("—");
    expect(formatBytes(Number.NaN)).toBe("—");
  });
});
