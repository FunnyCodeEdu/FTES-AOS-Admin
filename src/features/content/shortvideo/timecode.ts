// Mốc thời gian của clip: đổi qua lại mm:ss ↔ mili-giây, và LUẬT chặn khoảng cắt vô lý.
//
// Vì sao tách hẳn ra một module thuần (không React, không antd): đây là chỗ dễ sai nhất của cả
// tính năng — người dùng gõ tay mốc vào/ra, và một khoảng sai (end ≤ start, dài 2 tiếng, số âm)
// nếu lọt xuống BE sẽ đi tới tận service cắt video rồi mới 400. Bắt ngay ở FE thì admin sửa được
// tại chỗ, và luật ở đây test được bằng vitest mà không cần dựng cả trang.

/**
 * Trần độ dài một clip: 180 giây. CÙNG con số với hợp đồng service cắt video (nó trả 400 khi
 * vượt) — cố ý lặp lại ở FE để người dùng biết TRƯỚC khi bấm, chứ không phải để thay thế nó.
 * Server vẫn là nơi quyết định cuối cùng.
 */
export const MAX_CLIP_MS = 180_000;

/** Sàn độ dài: dưới 1 giây thì không còn là "clip" — thường là gõ nhầm mốc. */
export const MIN_CLIP_MS = 1_000;

/**
 * ms → "mm:ss". Phút KHÔNG cuộn về 0 sau 60: bài giảng dài 70 phút hiện "70:00" chứ không phải
 * "10:00" — mốc trong một video dài mà cuộn vòng thì admin đọc nhầm chỗ.
 * Giá trị rỗng/không hợp lệ trả "—" giống `formatDate` của các trang khác.
 */
export function formatMmSs(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "—";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Độ dài theo GIÂY (BE trả `durationSeconds`) → "mm:ss". */
export function formatDurationSeconds(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "—";
  return formatMmSs(seconds * 1000);
}

const MM_SS = /^(\d{1,4}):([0-5]\d)$/;

/**
 * "mm:ss" → ms. Trả `null` khi KHÔNG đọc được (rỗng, chữ, thiếu dấu hai chấm, giây ≥ 60, số âm).
 *
 * Cố ý KHÔNG "đoán ý" người dùng: "1:5" bị từ chối thay vì hiểu thành 1 phút 5 giây, vì nó cũng
 * có thể là 1 phút 50 giây bị gõ thiếu. Một ô đỏ rõ ràng tốt hơn một mốc sai âm thầm.
 */
export function parseMmSs(text: string | null | undefined): number | null {
  if (text == null) return null;
  const match = MM_SS.exec(text.trim());
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  return (minutes * 60 + seconds) * 1000;
}

export interface ClipRangeIssue {
  /** Mã để test bám vào — câu chữ hiển thị có thể sửa mà không làm hỏng test. */
  code:
    | "NEGATIVE"
    | "END_BEFORE_START"
    | "TOO_SHORT"
    | "TOO_LONG"
    | "BEYOND_DURATION";
  message: string;
}

/**
 * Kiểm khoảng [startMs, endMs] trước khi cho bấm "Cắt clip".
 *
 * Trả `null` khi hợp lệ, hoặc lý do ĐẦU TIÊN không hợp lệ. Thứ tự kiểm có chủ ý: số âm → end ≤
 * start → quá ngắn → quá dài → vượt thời lượng video. Báo "quá 3 phút" cho một khoảng đang có
 * end < start thì admin đi sửa nhầm ô.
 *
 * `videoDurationMs` là tuỳ chọn: lúc mới chọn bài học FE chưa chắc biết thời lượng (manifest
 * stream không luôn kèm), và khi không biết thì KHÔNG được bịa ra một trần rồi chặn oan.
 */
export function checkClipRange(
  startMs: number,
  endMs: number,
  videoDurationMs?: number | null
): ClipRangeIssue | null {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs < 0 || endMs < 0) {
    return { code: "NEGATIVE", message: "Mốc thời gian không hợp lệ (không được âm hoặc để trống)." };
  }
  if (endMs <= startMs) {
    return { code: "END_BEFORE_START", message: "Mốc ra phải LỚN HƠN mốc vào." };
  }
  const length = endMs - startMs;
  if (length < MIN_CLIP_MS) {
    return { code: "TOO_SHORT", message: "Clip ngắn hơn 1 giây — kiểm tra lại mốc vào/ra." };
  }
  if (length > MAX_CLIP_MS) {
    return {
      code: "TOO_LONG",
      message: `Clip dài ${formatMmSs(length)} — vượt trần ${MAX_CLIP_MS / 1000} giây.`,
    };
  }
  if (videoDurationMs != null && videoDurationMs > 0 && endMs > videoDurationMs) {
    return {
      code: "BEYOND_DURATION",
      message: `Mốc ra vượt quá thời lượng video (${formatMmSs(videoDurationMs)}).`,
    };
  }
  return null;
}

/** Tiện cho chỗ chỉ cần biết "cho bấm hay không". */
export function isValidClipRange(
  startMs: number,
  endMs: number,
  videoDurationMs?: number | null
): boolean {
  return checkClipRange(startMs, endMs, videoDurationMs) === null;
}

/** Dung lượng file clip → chuỗi đọc được. BE trả `sizeBytes`. */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${mb.toFixed(1)} MB`;
}
