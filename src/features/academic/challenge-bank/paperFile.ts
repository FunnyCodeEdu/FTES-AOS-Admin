/**
 * Kiểm tra tệp ĐỀ THI phía client — soi gương đúng ràng buộc của BE
 * (`POST /api/v1/admin/challenges/{id}/paper`).
 *
 * Đề không còn chỉ là "một tệp": đề PE là cả một THƯ MỤC (starter code + dữ liệu mẫu + bản mô tả),
 * đề FE là một xấp ảnh scan. Vì vậy tệp đề nay có BA loại, mỗi loại một TRẦN RIÊNG:
 *
 * | loại  | định dạng                        | trần    |
 * |-------|----------------------------------|---------|
 * | image | png / jpeg / webp                | 25 MB   |
 * | pdf   | pdf                              | 50 MB   |
 * | zip   | zip (tệp có sẵn, hoặc thư mục đã nén ở trình duyệt) | 50 MB  |
 *
 * Vì sao chặn ở client dù BE vẫn chặn: đẩy một tệp 90 MB lên rồi mới nhận 400 là vài PHÚT chờ đợi
 * cho một câu trả lời biết trước — và trên đường truyền kém thì lỗi hiện ra dưới dạng
 * "Kết nối thất bại", không nói được nguyên nhân thật.
 *
 * Nhưng client chỉ là TẤM GƯƠNG, không phải quan toà: khi server từ chối, UI hiện NGUYÊN VĂN message
 * của server (`paperServerMessage`) chứ không thay bằng con số trần đóng cứng ở đây — BE nới trần là
 * FE nói dối ngay.
 *
 * Mọi hàm trong file này THUẦN (chỉ đọc `name`/`size`/`type`/`webkitRelativePath`, hoặc byte đã đọc
 * sẵn) để unit test không cần jsdom upload thật. Phần đụng `jszip`/`Blob` nằm ở `paperFolderZip.ts`.
 */

/** Ba loại tệp đề. Trần và câu từ chối đều bám theo loại chứ không còn một trần chung. */
export type PaperKind = "image" | "pdf" | "zip";

export const PAPER_IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp"] as const;
export const PAPER_PDF_MIMES = ["application/pdf"] as const;

/** MIME zip theo HỢP ĐỒNG BE. Gửi lên nên dùng đúng một trong hai giá trị này. */
export const PAPER_ZIP_MIMES = ["application/zip", "application/x-zip-compressed"] as const;

/**
 * MIME zip vài OS/trình duyệt cũ còn phát ra. NHẬN DIỆN được (khỏi chặn oan) nhưng KHÔNG gửi
 * nguyên xi: `normalizeZipMime` đưa về `application/zip` trước khi lên đường.
 */
export const PAPER_ZIP_MIME_ALIASES = [
  "application/x-zip",
  "application/zip-compressed",
  "multipart/x-zip",
] as const;

/** MIME chuẩn khi FE tự dựng archive (nhánh thư mục) hoặc chuẩn hoá lại tệp người dùng chọn. */
export const PAPER_ZIP_CANONICAL_MIME = "application/zip";

export const PAPER_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"] as const;
export const PAPER_PDF_EXTENSIONS = [".pdf"] as const;
export const PAPER_ZIP_EXTENSIONS = [".zip"] as const;

export const PAPER_ACCEPTED_MIMES = [
  ...PAPER_PDF_MIMES,
  ...PAPER_IMAGE_MIMES,
  ...PAPER_ZIP_MIMES,
] as const;

export const PAPER_ACCEPTED_EXTENSIONS = [
  ...PAPER_PDF_EXTENSIONS,
  ...PAPER_IMAGE_EXTENSIONS,
  ...PAPER_ZIP_EXTENSIONS,
] as const;

/** Chuỗi `accept` cho `<input type="file">` / `Upload` của AntD. */
export const PAPER_ACCEPT_ATTR = [...PAPER_ACCEPTED_MIMES, ...PAPER_ACCEPTED_EXTENSIONS].join(",");

/** Trần từng loại — ĐỊNH NGHĨA THEO MEBIBYTE như BE (`n * 1024 * 1024`). */
export const PAPER_IMAGE_MAX_BYTES = 25 * 1024 * 1024;
export const PAPER_PDF_MAX_BYTES = 50 * 1024 * 1024;
/**
 * 50 MB, KHÔNG phải 100 MB. BE giữ trọn tệp trong heap khi proxy lên storage (~2× kích thước mỗi
 * lượt upload) và pod API chỉ có ~768 MB heap, nên trần server được đặt ở 50 MB; 100 MB là mức
 * clamp cứng, chỉ mở khi pod được cấp thêm RAM. Để 100 ở client thì người dùng tải xong 4 phút
 * mới bị server từ chối.
 */
export const PAPER_ZIP_MAX_BYTES = 50 * 1024 * 1024;

export const PAPER_KIND_MAX_BYTES: Record<PaperKind, number> = {
  image: PAPER_IMAGE_MAX_BYTES,
  pdf: PAPER_PDF_MAX_BYTES,
  zip: PAPER_ZIP_MAX_BYTES,
};

/** Tên loại trong câu tiếng Việt gửi tới admin ("Tệp ZIP nặng …"). */
export const PAPER_KIND_LABELS: Record<PaperKind, string> = {
  image: "ảnh",
  pdf: "PDF",
  zip: "ZIP",
};

/**
 * MIME "chung chung" — trình duyệt nói *có* kiểu nhưng thật ra là "tôi chịu".
 *
 * Windows trả rỗng khi registry thiếu ánh xạ đuôi; một số cấu hình lại trả thẳng
 * `application/octet-stream`. Cả hai đều KHÔNG phải bằng chứng để từ chối — lúc đó xét ĐUÔI tệp.
 * (BE cũng chấp `application/octet-stream` cho `.zip`, với điều kiện MAGIC BYTES là zip thật.)
 */
const GENERIC_MIMES = new Set([
  "application/octet-stream",
  "application/binary",
  "binary/octet-stream",
  "application/x-download",
]);

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  // Thư mục thô có thể tới hàng GB (guard `PAPER_FOLDER_MAX_RAW_BYTES` cần nói được con số đó);
  // "3072.0 MB" là con số không ai đọc nổi.
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot).toLowerCase();
}

function kindByMime(mime: string): PaperKind | null {
  if ((PAPER_IMAGE_MIMES as readonly string[]).includes(mime)) return "image";
  if ((PAPER_PDF_MIMES as readonly string[]).includes(mime)) return "pdf";
  if ((PAPER_ZIP_MIMES as readonly string[]).includes(mime)) return "zip";
  if ((PAPER_ZIP_MIME_ALIASES as readonly string[]).includes(mime)) return "zip";
  return null;
}

function kindByExtension(ext: string): PaperKind | null {
  if ((PAPER_IMAGE_EXTENSIONS as readonly string[]).includes(ext)) return "image";
  if ((PAPER_PDF_EXTENSIONS as readonly string[]).includes(ext)) return "pdf";
  if ((PAPER_ZIP_EXTENSIONS as readonly string[]).includes(ext)) return "zip";
  return null;
}

/**
 * Loại của tệp đề, hoặc `null` nếu không thuộc loại nào được nhận.
 *
 * Trình duyệt biết kiểu thật → TIN nó (tệp đặt sai đuôi không lừa được ai). Chỉ khi nó trả rỗng
 * hoặc một MIME chung chung mới quay sang xét đuôi.
 */
export function paperKindOf(file: Pick<File, "name" | "type">): PaperKind | null {
  const mime = (file.type || "").toLowerCase().trim();
  if (mime && !GENERIC_MIMES.has(mime)) return kindByMime(mime);
  return kindByExtension(extensionOf(file.name || ""));
}

/**
 * `true` khi trình duyệt KHÔNG khẳng định được đây là zip (MIME rỗng/chung chung) — tức là cần soi
 * magic bytes trước khi tin vào cái đuôi `.zip`.
 */
export function zipNeedsMagicCheck(file: Pick<File, "name" | "type">): boolean {
  const mime = (file.type || "").toLowerCase().trim();
  if (mime && !GENERIC_MIMES.has(mime)) return false;
  return kindByExtension(extensionOf(file.name || "")) === "zip";
}

/** MIME để GỬI LÊN cho một tệp zip: luôn là MIME hợp đồng, kể cả khi OS khai alias hay bỏ trống. */
export function normalizeZipMime(mime: string | null | undefined): string {
  const value = (mime || "").toLowerCase().trim();
  return (PAPER_ZIP_MIMES as readonly string[]).includes(value)
    ? value
    : PAPER_ZIP_CANONICAL_MIME;
}

/** Chữ ký 4 byte đầu của tệp zip: bản thường, bản rỗng, bản chia nhiều phần. */
const ZIP_MAGIC_PREFIXES: readonly (readonly number[])[] = [
  [0x50, 0x4b, 0x03, 0x04],
  [0x50, 0x4b, 0x05, 0x06],
  [0x50, 0x4b, 0x07, 0x08],
];

/**
 * Soi 4 byte đầu xem có phải zip thật không.
 *
 * BE đối chiếu magic bytes khi `.zip` tới dưới MIME chung chung ⇒ một tệp `.rar` đổi đuôi sẽ ăn 400
 * SAU KHI truyền xong hàng chục MB. Chặn ở đây tốn 4 byte.
 */
export function looksLikeZip(head: ArrayBuffer | Uint8Array | null | undefined): boolean {
  if (!head) return false;
  const bytes = head instanceof Uint8Array ? head : new Uint8Array(head);
  if (bytes.length < 4) return false;
  return ZIP_MAGIC_PREFIXES.some((sig) => sig.every((byte, i) => bytes[i] === byte));
}

/** Liệt kê định dạng nhận kèm trần từng loại — dùng cho cả câu từ chối lẫn dòng chú thích UI. */
export function describePaperLimits(): string {
  return (
    `ảnh PNG/JPEG/WebP tối đa ${formatBytes(PAPER_IMAGE_MAX_BYTES)}, ` +
    `PDF tối đa ${formatBytes(PAPER_PDF_MAX_BYTES)}, ` +
    `.zip tối đa ${formatBytes(PAPER_ZIP_MAX_BYTES)}`
  );
}

/**
 * Trả `null` khi tệp hợp lệ, hoặc câu tiếng Việt nêu ĐÚNG nguyên nhân từ chối — có tên loại, cỡ tệp
 * và trần CỦA LOẠI ĐÓ (nói "vượt 25 MB" cho một tệp zip là chỉ sai chỗ để admin đi sửa).
 *
 * KHÔNG soi magic bytes ở đây: hàm này thuần và đồng bộ, còn đọc byte là việc bất đồng bộ. Nơi gọi
 * chạy thêm `zipNeedsMagicCheck` + `looksLikeZip` cho nhánh zip.
 */
export function validatePaperFile(file: Pick<File, "name" | "size" | "type">): string | null {
  const kind = paperKindOf(file);

  if (!kind) {
    return `Chỉ nhận tệp đề dạng PDF, PNG, JPEG, WebP hoặc .zip (${describePaperLimits()}).`;
  }

  if (file.size <= 0) {
    return "Tệp rỗng — hãy chọn lại tệp đề.";
  }

  const cap = PAPER_KIND_MAX_BYTES[kind];
  if (file.size > cap) {
    const label = PAPER_KIND_LABELS[kind];
    return `Tệp ${label} nặng ${formatBytes(file.size)} — vượt trần ${formatBytes(cap)} cho tệp ${label}.`;
  }

  return null;
}

/** Mã lỗi kiểu `CHALLENGE_PAPER_TOO_LARGE: …` mà vài handler của BE nhét vào ĐẦU message. */
const ERROR_CODE_PREFIX = /^[A-Z][A-Z0-9_]{2,}:\s*/;

/**
 * Message của SERVER, hiện nguyên văn cho admin — chỉ cắt tiền tố mã lỗi.
 *
 * Trần và danh sách định dạng là hợp đồng của server. Dịch lại thành câu đóng cứng ở FE (bảng
 * `ADMIN_ERROR_MESSAGES` từng làm thế với `CHALLENGE_PAPER_TOO_LARGE` = "vượt 25 MB") nghĩa là ngày
 * BE nới trần, FE vẫn dõng dạc nói con số cũ và admin đi sửa nhầm việc.
 */
export function paperServerMessage(raw: string | null | undefined): string {
  const msg = (raw ?? "").trim();
  if (!msg) return "Máy chủ từ chối tệp đề nhưng không kèm lý do.";
  const stripped = msg.replace(ERROR_CODE_PREFIX, "").trim();
  return stripped || msg;
}

// ------------------------------------------------------------------ thư mục → zip

/** Chỉ cần bấy nhiêu để lập kế hoạch nén — nhờ vậy test không phải dựng `File` thật. */
export interface PaperFolderInput {
  name: string;
  size: number;
  /** `input[webkitdirectory]` gắn thuộc tính này; `File` chọn lẻ thì là chuỗi rỗng. */
  webkitRelativePath?: string;
}

export type PaperFolderSkipReason = "junk" | "empty";

export interface PaperFolderSkip {
  reason: PaperFolderSkipReason;
  count: number;
  samples: string[];
}

export interface PaperFolderItem<T = File> {
  file: T;
  /** Đường dẫn TƯƠNG ĐỐI trong thư mục đã chọn — cũng là đường dẫn bên trong archive. */
  path: string;
}

export interface PaperFolderPlan<T = File> {
  items: PaperFolderItem<T>[];
  /** Tổng số tệp admin đã chọn (kể cả tệp bị bỏ). */
  picked: number;
  /** Tệp không nén, gom theo lý do — LUÔN hiển thị, không bao giờ bỏ im lặng. */
  skipped: PaperFolderSkip[];
  /** Tổng dung lượng THÔ của phần sẽ nén (chưa nén). */
  rawBytes: number;
  /** Tên thư mục gốc admin đã chọn, dùng đặt tên archive. */
  rootName: string;
}

/**
 * Trần dung lượng THÔ của thư mục trước khi nén — GUARD CỦA CLIENT, không phải hợp đồng BE.
 *
 * Nén 500 MB trong một tab trình duyệt là treo máy vài phút để rồi gần như chắc chắn vẫn vượt trần
 * trần archive. Thà từ chối ngay và nói con số ra.
 */
export const PAPER_FOLDER_MAX_RAW_BYTES = 500 * 1024 * 1024;

/** Số tên tệp ví dụ mỗi dòng cảnh báo — đủ để nhận ra, không đủ để ngập UI. */
const SAMPLE_LIMIT = 5;

/** Rác của hệ điều hành: nén vào chỉ tổ phình archive và làm bẩn cây thư mục người chấm mở ra. */
const JUNK_BASENAMES = new Set([".ds_store", "thumbs.db", "desktop.ini"]);

/** Đường dẫn tương đối trong thư mục đã chọn (input `webkitdirectory`), fallback về tên tệp. */
export function folderRelativePath(file: PaperFolderInput): string {
  const rel = file.webkitRelativePath;
  return rel && rel.length > 0 ? rel : file.name;
}

function isJunkPath(path: string): boolean {
  const segments = path.split("/");
  // Thư mục siêu dữ liệu macOS nhét kèm khi giải nén/copy — không phải nội dung đề.
  if (segments.some((s) => s === "__MACOSX")) return true;
  const base = (segments[segments.length - 1] ?? "").toLowerCase();
  if (JUNK_BASENAMES.has(base)) return true;
  // AppleDouble ("._Bai1.java") đi kèm từng tệp khi copy qua ổ FAT/mạng.
  return base.startsWith("._");
}

function pushSkip(
  map: Map<PaperFolderSkipReason, PaperFolderSkip>,
  reason: PaperFolderSkipReason,
  name: string
) {
  const entry = map.get(reason) ?? { reason, count: 0, samples: [] };
  entry.count += 1;
  if (entry.samples.length < SAMPLE_LIMIT) entry.samples.push(name);
  map.set(reason, entry);
}

/** Tên thư mục gốc = đoạn đầu của đường dẫn tương đối (mọi tệp cùng một gốc). */
function rootNameOf(files: readonly PaperFolderInput[]): string {
  for (const file of files) {
    const path = folderRelativePath(file);
    const first = path.split("/")[0];
    if (first && first !== path) return first;
  }
  return "";
}

/**
 * Lập kế hoạch nén: bỏ rác + tệp 0 byte, giữ nguyên đường dẫn tương đối, đếm dung lượng thô.
 *
 * Giữ `webkitRelativePath` là điều kiện sống còn của đề PE: bài nộp mẫu, dữ liệu test và bản mô tả
 * nằm ở các thư mục con khác nhau — nén phẳng ra một rổ là mất luôn cấu trúc mà đề dựa vào.
 */
export function planPaperFolderZip<T extends PaperFolderInput>(
  files: readonly T[]
): PaperFolderPlan<T> {
  const skips = new Map<PaperFolderSkipReason, PaperFolderSkip>();
  const items: PaperFolderItem<T>[] = [];
  let rawBytes = 0;

  for (const file of files) {
    const path = folderRelativePath(file);
    if (isJunkPath(path)) {
      pushSkip(skips, "junk", path);
      continue;
    }
    if (!(file.size > 0)) {
      pushSkip(skips, "empty", path);
      continue;
    }
    items.push({ file, path });
    rawBytes += file.size;
  }

  return {
    items,
    picked: files.length,
    // Thứ tự cố định để UI không nhảy chỗ giữa hai lần chọn.
    skipped: (["junk", "empty"] as PaperFolderSkipReason[])
      .map((r) => skips.get(r))
      .filter((s): s is PaperFolderSkip => Boolean(s)),
    rawBytes,
    rootName: rootNameOf(files),
  };
}

function samplesOf(skip: PaperFolderSkip): string {
  const shown = skip.samples.join(", ");
  return skip.count > skip.samples.length ? `${shown}, …` : shown;
}

/** Câu tiếng Việt cho từng nhóm tệp bị bỏ — số lượng + lý do + vài tên ví dụ. */
export function describeFolderSkips(plan: PaperFolderPlan<PaperFolderInput>): string[] {
  return plan.skipped.map((skip) => {
    switch (skip.reason) {
      case "junk":
        return `Bỏ qua ${skip.count} tệp rác của hệ điều hành (${samplesOf(skip)}).`;
      case "empty":
        return `Bỏ qua ${skip.count} tệp rỗng 0 byte (${samplesOf(skip)}).`;
      default:
        return `Bỏ qua ${skip.count} tệp (${samplesOf(skip)}).`;
    }
  });
}

/**
 * Tên archive gửi lên: theo tên thư mục admin chọn, rơi về tiêu đề thử thách nếu trình duyệt không
 * cho biết thư mục gốc.
 *
 * Tên tệp đi qua header multipart rồi qua hệ tệp của server — đừng bắt chúng đoán Unicode. Nhưng
 * chặt thẳng dấu tiếng Việt thành `_` thì "Đề PE kỳ 3" ra `_PE_k_3.zip`, một cái tên vô nghĩa; nên
 * BỎ DẤU trước (NFD + gỡ dấu kết hợp, thêm `đ/Đ` vốn không phân rã) rồi mới thay ký tự còn lại.
 */
export function folderArchiveName(rootName: string, fallback?: string): string {
  const base = (rootName || fallback || "de-thi").trim();
  const safe = base
    .replace(/\.zip$/i, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return `${safe || "de-thi"}.zip`;
}
