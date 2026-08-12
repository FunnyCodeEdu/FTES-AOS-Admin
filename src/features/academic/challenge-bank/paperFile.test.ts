import { describe, expect, it } from "vitest";
import {
  describeFolderSkips,
  describePaperLimits,
  folderArchiveName,
  formatBytes,
  looksLikeZip,
  normalizeZipMime,
  PAPER_IMAGE_MAX_BYTES,
  PAPER_PDF_MAX_BYTES,
  PAPER_ZIP_MAX_BYTES,
  paperKindOf,
  paperServerMessage,
  planPaperFolderZip,
  validatePaperFile,
  zipNeedsMagicCheck,
} from "./paperFile";

const file = (name: string, type: string, size: number) => ({ name, type, size });

/** Tệp giả trong thư mục đã chọn: chỉ cần `name`/`size`/`webkitRelativePath`. */
const entry = (webkitRelativePath: string, size = 1024) => ({
  name: webkitRelativePath.split("/").pop() ?? webkitRelativePath,
  size,
  webkitRelativePath,
});

const zipHead = (...bytes: number[]) => new Uint8Array(bytes);

describe("paperKindOf", () => {
  it("phân loại theo MIME khi trình duyệt biết kiểu", () => {
    expect(paperKindOf(file("de.png", "image/png", 1))).toBe("image");
    expect(paperKindOf(file("de.pdf", "application/pdf", 1))).toBe("pdf");
    expect(paperKindOf(file("de.zip", "application/zip", 1))).toBe("zip");
    expect(paperKindOf(file("de.zip", "application/x-zip-compressed", 1))).toBe("zip");
  });

  it("MIME lạ nhưng CÓ khai ⇒ không đoán lại theo đuôi", () => {
    expect(paperKindOf(file("de.zip", "application/msword", 1))).toBeNull();
  });

  it("MIME rỗng hoặc chung chung ⇒ xét ĐUÔI tệp", () => {
    expect(paperKindOf(file("de.zip", "", 1))).toBe("zip");
    expect(paperKindOf(file("de.zip", "application/octet-stream", 1))).toBe("zip");
    expect(paperKindOf(file("de.pdf", "application/octet-stream", 1))).toBe("pdf");
    expect(paperKindOf(file("de.exe", "application/octet-stream", 1))).toBeNull();
  });
});

describe("validatePaperFile", () => {
  it("nhận pdf/png/jpeg/webp/zip trong giới hạn", () => {
    expect(validatePaperFile(file("de-pe.pdf", "application/pdf", 1024))).toBeNull();
    expect(validatePaperFile(file("de.png", "image/png", 1024))).toBeNull();
    expect(validatePaperFile(file("de.jpg", "image/jpeg", 1024))).toBeNull();
    expect(validatePaperFile(file("de.webp", "image/webp", 1024))).toBeNull();
    expect(validatePaperFile(file("bo-de.zip", "application/zip", 1024))).toBeNull();
  });

  it("từ chối định dạng khác và nói rõ định dạng nào được nhận", () => {
    const msg = validatePaperFile(file("de.docx", "application/msword", 1024));
    expect(msg).toContain("PDF");
    expect(msg).toContain("WebP");
    expect(msg).toContain(".zip");
  });

  it("MIME rỗng (Windows thiếu ánh xạ) thì xét theo ĐUÔI tệp", () => {
    expect(validatePaperFile(file("de.pdf", "", 1024))).toBeNull();
    expect(validatePaperFile(file("bo-de.zip", "", 1024))).toBeNull();
    expect(validatePaperFile(file("de.exe", "", 1024))).not.toBeNull();
  });

  it("từ chối tệp rỗng", () => {
    expect(validatePaperFile(file("de.pdf", "application/pdf", 0))).toContain("rỗng");
  });

  it("mỗi loại có TRẦN RIÊNG — vượt trần thì nêu cả tên loại, cỡ tệp lẫn trần", () => {
    const img = validatePaperFile(file("de.png", "image/png", PAPER_IMAGE_MAX_BYTES + 1));
    expect(img).toContain("ảnh");
    expect(img).toContain("25.0 MB");

    const pdf = validatePaperFile(file("de.pdf", "application/pdf", PAPER_PDF_MAX_BYTES + 1));
    expect(pdf).toContain("PDF");
    expect(pdf).toContain("50.0 MB");

    const zip = validatePaperFile(file("de.zip", "application/zip", PAPER_ZIP_MAX_BYTES + 1));
    expect(zip).toContain("ZIP");
    // Bám HẰNG SỐ, không đóng cứng con số: trần zip đã đổi 100→50 MB một lần (theo heap của pod BE)
    // và sẽ còn đổi. Test phải kiểm "có nêu đúng trần" chứ không phải "trần bằng đúng 100".
    expect(zip).toContain(formatBytes(PAPER_ZIP_MAX_BYTES));
  });

  it("trần của loại này KHÔNG áp lên loại kia", () => {
    // 40 MB: quá trần ảnh (25) nhưng vẫn trong trần PDF (50) và ZIP (100).
    const size = 40 * 1024 * 1024;
    expect(validatePaperFile(file("de.pdf", "application/pdf", size))).toBeNull();
    expect(validatePaperFile(file("de.zip", "application/zip", size))).toBeNull();
    expect(validatePaperFile(file("de.png", "image/png", size))).not.toBeNull();
  });

  it("đúng trần thì vẫn nhận (biên là <=)", () => {
    expect(validatePaperFile(file("de.png", "image/png", PAPER_IMAGE_MAX_BYTES))).toBeNull();
    expect(validatePaperFile(file("de.pdf", "application/pdf", PAPER_PDF_MAX_BYTES))).toBeNull();
    expect(validatePaperFile(file("de.zip", "application/zip", PAPER_ZIP_MAX_BYTES))).toBeNull();
  });
});

describe("magic bytes của zip", () => {
  it("chỉ cần soi khi trình duyệt KHÔNG khẳng định được kiểu", () => {
    expect(zipNeedsMagicCheck(file("de.zip", "", 1))).toBe(true);
    expect(zipNeedsMagicCheck(file("de.zip", "application/octet-stream", 1))).toBe(true);
    expect(zipNeedsMagicCheck(file("de.zip", "application/zip", 1))).toBe(false);
    expect(zipNeedsMagicCheck(file("de.pdf", "", 1))).toBe(false);
  });

  it("nhận ba dạng chữ ký PK, từ chối tệp khác đổi đuôi", () => {
    expect(looksLikeZip(zipHead(0x50, 0x4b, 0x03, 0x04))).toBe(true);
    expect(looksLikeZip(zipHead(0x50, 0x4b, 0x05, 0x06))).toBe(true);
    expect(looksLikeZip(zipHead(0x50, 0x4b, 0x07, 0x08))).toBe(true);
    // "Rar!" — .rar đổi đuôi thành .zip.
    expect(looksLikeZip(zipHead(0x52, 0x61, 0x72, 0x21))).toBe(false);
  });

  it("thiếu byte hoặc không có dữ liệu thì KHÔNG coi là zip", () => {
    expect(looksLikeZip(zipHead(0x50, 0x4b))).toBe(false);
    expect(looksLikeZip(null)).toBe(false);
    expect(looksLikeZip(undefined)).toBe(false);
  });

  it("gửi lên luôn bằng MIME hợp đồng", () => {
    expect(normalizeZipMime("")).toBe("application/zip");
    expect(normalizeZipMime("application/octet-stream")).toBe("application/zip");
    expect(normalizeZipMime("application/x-zip")).toBe("application/zip");
    // MIME đã đúng hợp đồng thì giữ nguyên.
    expect(normalizeZipMime("application/x-zip-compressed")).toBe("application/x-zip-compressed");
  });
});

describe("planPaperFolderZip", () => {
  it("giữ NGUYÊN đường dẫn tương đối để cấu trúc thư mục sống sót", () => {
    const plan = planPaperFolderZip([
      entry("de-pe/README.md"),
      entry("de-pe/src/Main.java"),
      entry("de-pe/data/input1.txt"),
    ]);
    expect(plan.items.map((i) => i.path)).toEqual([
      "de-pe/README.md",
      "de-pe/src/Main.java",
      "de-pe/data/input1.txt",
    ]);
    expect(plan.rootName).toBe("de-pe");
    expect(plan.rawBytes).toBe(3 * 1024);
    expect(plan.skipped).toEqual([]);
  });

  it("bỏ rác hệ điều hành và tệp 0 byte, ĐẾM và nêu ví dụ chứ không bỏ im lặng", () => {
    const plan = planPaperFolderZip([
      entry("de-pe/Main.java"),
      entry("de-pe/.DS_Store"),
      entry("de-pe/anh/Thumbs.db"),
      entry("de-pe/desktop.ini"),
      entry("__MACOSX/de-pe/._Main.java"),
      entry("de-pe/._Main.java"),
      entry("de-pe/trong.txt", 0),
    ]);

    expect(plan.picked).toBe(7);
    expect(plan.items).toHaveLength(1);
    expect(plan.rawBytes).toBe(1024);

    const junk = plan.skipped.find((s) => s.reason === "junk");
    const empty = plan.skipped.find((s) => s.reason === "empty");
    expect(junk?.count).toBe(5);
    expect(empty?.count).toBe(1);

    const notes = describeFolderSkips(plan);
    expect(notes.join(" ")).toContain("5 tệp rác");
    expect(notes.join(" ")).toContain("1 tệp rỗng");
    expect(notes.join(" ")).toContain(".DS_Store");
  });

  it("không tệp nào bị bỏ ⇒ không có câu cảnh báo nào", () => {
    const plan = planPaperFolderZip([entry("de/a.txt"), entry("de/b.txt")]);
    expect(describeFolderSkips(plan)).toEqual([]);
  });

  it("chỉ liệt kê tối đa 5 tên ví dụ rồi thêm dấu …", () => {
    const plan = planPaperFolderZip(
      Array.from({ length: 8 }, (_, i) => entry(`de/thu-muc-${i}/.DS_Store`))
    );
    const junk = plan.skipped.find((s) => s.reason === "junk");
    expect(junk?.count).toBe(8);
    expect(junk?.samples).toHaveLength(5);
    expect(describeFolderSkips(plan)[0]).toContain("…");
  });

  it("tệp chọn lẻ (không có webkitRelativePath) dùng tên tệp làm đường dẫn", () => {
    const plan = planPaperFolderZip([{ name: "de.pdf", size: 10 }]);
    expect(plan.items[0].path).toBe("de.pdf");
    expect(plan.rootName).toBe("");
  });
});

describe("folderArchiveName", () => {
  it("bỏ dấu tiếng Việt thay vì băm thành _, giữ tên còn đọc được", () => {
    expect(folderArchiveName("de-pe-mae101")).toBe("de-pe-mae101.zip");
    expect(folderArchiveName("Đề PE kỳ 3")).toBe("De_PE_ky_3.zip");
  });

  it("không có thư mục gốc thì rơi về tên thử thách, rồi tới mặc định", () => {
    expect(folderArchiveName("", "Bài thi cuối kỳ")).toBe("Bai_thi_cuoi_ky.zip");
    expect(folderArchiveName("", "")).toBe("de-thi.zip");
    expect(folderArchiveName("!!!")).toBe("de-thi.zip");
  });

  it("không nhân đôi đuôi .zip", () => {
    expect(folderArchiveName("bo-de.zip")).toBe("bo-de.zip");
  });
});

describe("paperServerMessage", () => {
  it("cắt tiền tố mã lỗi, giữ NGUYÊN VĂN phần người đọc được", () => {
    expect(paperServerMessage("CHALLENGE_PAPER_TOO_LARGE: Tệp vượt trần 100 MB của máy chủ.")).toBe(
      "Tệp vượt trần 100 MB của máy chủ."
    );
    expect(paperServerMessage("Tệp đề không hợp lệ")).toBe("Tệp đề không hợp lệ");
  });

  it("không cắt nhầm câu thường có dấu hai chấm", () => {
    expect(paperServerMessage("Định dạng nhận: pdf, png, zip")).toBe(
      "Định dạng nhận: pdf, png, zip"
    );
  });

  it("message rỗng vẫn ra câu đọc được, không ra chuỗi trắng", () => {
    expect(paperServerMessage("")).toContain("không kèm lý do");
    expect(paperServerMessage(null)).toContain("không kèm lý do");
  });
});

describe("describePaperLimits", () => {
  it("nêu đủ ba loại kèm trần của từng loại", () => {
    const text = describePaperLimits();
    // Bám hằng số (xem ghi chú ở test trần zip): kiểm "nêu đủ trần của cả ba loại", không phải
    // "ba con số cụ thể" — hai loại có thể trùng trần mà câu vẫn đúng.
    expect(text).toContain(formatBytes(PAPER_IMAGE_MAX_BYTES));
    expect(text).toContain(formatBytes(PAPER_PDF_MAX_BYTES));
    expect(text).toContain(formatBytes(PAPER_ZIP_MAX_BYTES));
  });
});

describe("formatBytes", () => {
  it("đổi đơn vị theo cỡ", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
    // Thư mục thô cỡ GB: guard trước khi nén phải nói được con số đọc nổi.
    expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe("3.00 GB");
  });

  it("giá trị vắng/không hợp lệ ra dấu gạch, không ra NaN", () => {
    expect(formatBytes(null)).toBe("—");
    expect(formatBytes(undefined)).toBe("—");
    expect(formatBytes(Number.NaN)).toBe("—");
  });
});
