/**
 * Kiểm tra tệp ĐỀ THI phía client — soi gương đúng ràng buộc của BE
 * (`POST /api/v1/admin/challenges/{id}/paper`: pdf/png/jpeg/webp, trần 25 MB).
 *
 * Vì sao chặn ở client dù BE vẫn chặn: đẩy một tệp 60 MB lên rồi mới nhận 400 là ba mươi giây chờ
 * đợi cho một câu trả lời biết trước — và trên đường truyền kém thì lỗi hiện ra dưới dạng
 * "Kết nối thất bại", không nói được nguyên nhân thật.
 *
 * Hàm THUẦN (chỉ đọc `type`/`size`/`name` của File) để unit test không cần jsdom upload thật.
 */

/** MIME BE nhận. `image/jpg` KHÔNG phải MIME hợp lệ nhưng vài trình duyệt/OS vẫn phát ra nó. */
export const PAPER_ACCEPTED_MIMES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

/** Đuôi tệp tương ứng — dùng cho thuộc tính `accept` của input và cho fallback khi MIME rỗng. */
export const PAPER_ACCEPTED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp"] as const;

/** Chuỗi `accept` cho `<input type="file">` / `Upload` của AntD. */
export const PAPER_ACCEPT_ATTR = [...PAPER_ACCEPTED_MIMES, ...PAPER_ACCEPTED_EXTENSIONS].join(",");

/** Trần dung lượng — 25 MB, ĐỊNH NGHĨA THEO MEBIBYTE như BE (`25 * 1024 * 1024`). */
export const PAPER_MAX_BYTES = 25 * 1024 * 1024;

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot).toLowerCase();
}

/**
 * Trả `null` khi tệp hợp lệ, hoặc câu tiếng Việt nêu ĐÚNG nguyên nhân từ chối.
 *
 * MIME rỗng (`""`) xảy ra thật trên Windows khi registry thiếu ánh xạ đuôi tệp — lúc đó xét ĐUÔI
 * thay vì từ chối thẳng, nhưng đuôi lạ thì vẫn chặn.
 */
export function validatePaperFile(file: Pick<File, "name" | "size" | "type">): string | null {
  const mime = (file.type || "").toLowerCase();
  const ext = extensionOf(file.name || "");
  const mimeOk = (PAPER_ACCEPTED_MIMES as readonly string[]).includes(mime);
  const extOk = (PAPER_ACCEPTED_EXTENSIONS as readonly string[]).includes(ext);

  if (mime ? !mimeOk : !extOk) {
    return "Chỉ nhận tệp đề dạng PDF, PNG, JPEG hoặc WebP.";
  }

  if (file.size <= 0) {
    return "Tệp rỗng — hãy chọn lại tệp đề.";
  }

  if (file.size > PAPER_MAX_BYTES) {
    return `Tệp ${formatBytes(file.size)} vượt giới hạn ${formatBytes(PAPER_MAX_BYTES)}.`;
  }

  return null;
}
