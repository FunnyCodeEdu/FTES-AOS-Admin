import { describe, expect, it } from "vitest";
import {
  buildPaperFilesFormData,
  describeFolderSkips,
  describePaperBatchLimits,
  describePaperLimits,
  folderArchiveName,
  formatBytes,
  looksLikeZip,
  mergePaperPicks,
  movePaperFile,
  normalizeZipMime,
  PAPER_IMAGE_MAX_BYTES,
  PAPER_MAX_FILES,
  PAPER_MAX_TOTAL_BYTES,
  PAPER_PDF_MAX_BYTES,
  PAPER_ZIP_MAX_BYTES,
  paperKindOf,
  paperRoleColor,
  paperRoleLabel,
  paperServerMessage,
  planPaperFolderZip,
  sumPaperFileBytes,
  validatePaperBatch,
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

// ------------------------------------------------------------ bộ đề NHIỀU TỆP

describe("paperRoleLabel / paperRoleColor", () => {
  it("dán nhãn theo `role` SERVER trả, không suy lại từ MIME", () => {
    expect(paperRoleLabel("VIEW")).toBe("Xem tại chỗ");
    expect(paperRoleLabel("DOWNLOAD")).toBe("Tải về");
    expect(paperRoleColor("VIEW")).toBe("blue");
    expect(paperRoleColor("DOWNLOAD")).toBe("orange");
  });

  it("chấp cả dạng thường/thừa khoảng trắng của cùng một vai", () => {
    expect(paperRoleLabel(" view ")).toBe("Xem tại chỗ");
    expect(paperRoleLabel("download")).toBe("Tải về");
  });

  it("vai lạ/vắng ⇒ nói KHÔNG RÕ chứ không đoán bừa", () => {
    // BE thêm vai mới mà FE chưa biết: đoán bừa "Tải về" cho một tệp xem-được là dán nhãn SAI lên
    // thứ admin đang kiểm — thà nói chưa biết.
    expect(paperRoleLabel("PRINT_ONLY")).toBe("Không rõ");
    expect(paperRoleLabel(null)).toBe("Không rõ");
    expect(paperRoleLabel(undefined)).toBe("Không rõ");
    expect(paperRoleColor(null)).toBe("default");
  });
});

describe("sumPaperFileBytes", () => {
  it("cộng dung lượng và bỏ qua phần tử BE trả thiếu sizeBytes", () => {
    expect(sumPaperFileBytes([{ sizeBytes: 100 }, { sizeBytes: null }, {}])).toBe(100);
    expect(sumPaperFileBytes([])).toBe(0);
  });
});

describe("validatePaperBatch", () => {
  const png = (name: string, size: number) => ({ name, type: "image/png", size });

  it("lô rỗng KHÔNG phải lỗi (nút Tải lên tự vô hiệu, đừng doạ người dùng)", () => {
    expect(validatePaperBatch([], [])).toBeNull();
  });

  it("lô hợp lệ trong trần ⇒ null", () => {
    expect(validatePaperBatch([{ sizeBytes: 1024 }], [png("trang-1.png", 2048)])).toBeNull();
  });

  it("nêu ĐÍCH DANH tệp hỏng loại/trần loại, không chỉ nói 'lô sai'", () => {
    const msg = validatePaperBatch([], [png("ok.png", 1024), { name: "de.exe", type: "", size: 1 }]);
    expect(msg).toContain("de.exe");
  });

  it("vượt trần SỐ TỆP ⇒ nói rõ đang có bao nhiêu và chọn thêm bao nhiêu", () => {
    const existing = Array.from({ length: PAPER_MAX_FILES }, () => ({ sizeBytes: 1 }));
    const msg = validatePaperBatch(existing, [png("them.png", 1)]);
    expect(msg).toContain(String(PAPER_MAX_FILES));
    expect(msg).toContain(`${PAPER_MAX_FILES + 1} tệp`);
  });

  it("vượt trần TỔNG BYTE ⇒ câu khác hẳn câu vượt số tệp (hai cách sửa khác nhau)", () => {
    // Đúng trần từng tệp (ảnh 25 MB) nhưng cộng với bộ đề đang có thì vượt tổng.
    const existing = [{ sizeBytes: PAPER_MAX_TOTAL_BYTES - 1024 }];
    const msg = validatePaperBatch(existing, [png("trang.png", 20 * 1024 * 1024)]);
    expect(msg).toContain(formatBytes(PAPER_MAX_TOTAL_BYTES));
    expect(msg).not.toContain("vượt trần 20 tệp");
  });

  it("bộ đề đang đính thiếu sizeBytes KHÔNG chặn oan lượt gửi", () => {
    expect(validatePaperBatch([{ sizeBytes: null }], [png("trang.png", 1024)])).toBeNull();
  });
});

describe("mergePaperPicks", () => {
  const pick = (name: string, size = 10, lastModified = 1) => ({
    file: { name, size, lastModified },
  });

  it("gộp lô mới vào cuối, giữ thứ tự đã chọn", () => {
    const out = mergePaperPicks([pick("a.png")], [pick("b.png"), pick("c.zip")]);
    expect(out.picks.map((p) => p.file.name)).toEqual(["a.png", "b.png", "c.zip"]);
    expect(out.duplicates).toBe(0);
  });

  it("bỏ tệp trùng (quét trúng lại) và ĐẾM để UI nói ra", () => {
    const out = mergePaperPicks([pick("a.png")], [pick("a.png"), pick("b.png")]);
    expect(out.picks.map((p) => p.file.name)).toEqual(["a.png", "b.png"]);
    expect(out.duplicates).toBe(1);
  });

  it("trùng TÊN nhưng khác cỡ/thời điểm sửa là hai tệp KHÁC nhau", () => {
    const out = mergePaperPicks([pick("trang.png", 10, 1)], [pick("trang.png", 20, 1)]);
    expect(out.picks).toHaveLength(2);
    expect(out.duplicates).toBe(0);
  });
});

describe("movePaperFile", () => {
  const files = ["a", "b", "c"];

  it("lên/xuống một bậc, trả MẢNG MỚI", () => {
    expect(movePaperFile(files, 2, -1)).toEqual(["a", "c", "b"]);
    expect(movePaperFile(files, 0, 1)).toEqual(["b", "a", "c"]);
    expect(movePaperFile(files, 2, -1)).not.toBe(files);
  });

  it("không đổi được ⇒ trả CHÍNH mảng cũ (nơi gọi so tham chiếu để khỏi bắn PUT /order thừa)", () => {
    expect(movePaperFile(files, 0, -1)).toBe(files);
    expect(movePaperFile(files, 2, 1)).toBe(files);
    expect(movePaperFile(files, -1, 1)).toBe(files);
    expect(movePaperFile(files, 9, -1)).toBe(files);
  });

  it("không đụng mảng gốc", () => {
    movePaperFile(files, 0, 1);
    expect(files).toEqual(["a", "b", "c"]);
  });
});

describe("buildPaperFilesFormData", () => {
  const file = (name: string) => new File(["x"], name, { type: "image/png" });

  it("mọi tệp vào CÙNG một part tên `files` (không phải files[0]/files[1])", () => {
    const form = buildPaperFilesFormData([file("trang-1.png"), file("trang-2.png")]);
    const parts = form.getAll("files");
    expect(parts).toHaveLength(2);
    expect(form.getAll("files[0]")).toHaveLength(0);
    expect((parts[0] as File).name).toBe("trang-1.png");
    expect((parts[1] as File).name).toBe("trang-2.png");
  });

  it("giữ nguyên tên tệp tiếng Việt", () => {
    const form = buildPaperFilesFormData([file("Đề PE trang 1.png")]);
    expect((form.get("files") as File).name).toBe("Đề PE trang 1.png");
  });

  it("lô rỗng ⇒ FormData rỗng, không dựng part ma", () => {
    expect(buildPaperFilesFormData([]).getAll("files")).toHaveLength(0);
  });
});

describe("describePaperBatchLimits", () => {
  it("nêu cả trần số tệp lẫn trần tổng dung lượng", () => {
    const text = describePaperBatchLimits();
    expect(text).toContain(String(PAPER_MAX_FILES));
    expect(text).toContain(formatBytes(PAPER_MAX_TOTAL_BYTES));
  });
});
