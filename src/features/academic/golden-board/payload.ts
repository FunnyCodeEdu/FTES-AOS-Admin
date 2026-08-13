import {
  MAX_ACHIEVEMENT_LINES,
  type GoldenBoardEntry,
  type GoldenBoardEntryFormValues,
  type GoldenBoardEntryUpsertRequest,
} from "./types";

/**
 * Dựng body POST/PUT từ giá trị form. Tách khỏi component vì đây là chỗ DUY NHẤT quyết định
 * "gửi gì / không gửi gì", mà PUT của BE là bán phần nên gửi thiếu và gửi thừa hỏng theo hai kiểu
 * khác nhau:
 *
 * <ul>
 *   <li><b>Text/rank/active/lines luôn gửi</b> — form đã bind vào field RAW đã lưu, nên "gửi đúng
 *       những gì đang thấy trong ô" là WYSIWYG: ô bị xoá trắng → gửi "" → BE quy về null (xoá
 *       field); danh sách dòng bị xoá hết → gửi [] → BE xoá hết. Nếu bỏ qua ô rỗng thì admin
 *       KHÔNG BAO GIỜ xoá được một headline đã nhập.</li>
 *   <li><b>userId chỉ gửi khi có giá trị</b> — với PUT, {@code userId: null} mang nghĩa "giữ
 *       nguyên link", KHÔNG phải "gỡ link". Vì thế xoá trắng ô tài khoản là thao tác VÔ HẠI (giữ
 *       nguyên), và gỡ link phải đi qua cờ {@code unlinkUser} tường minh — đúng hợp đồng BE và
 *       tránh việc mở một dòng ra xem rồi bấm Lưu lại âm thầm tháo tài khoản khỏi bảng.</li>
 * </ul>
 *
 * @param entry dòng đang sửa; null = đang tạo mới (khi đó không có gì để "gỡ").
 */
export function buildGoldenBoardPayload(
  values: GoldenBoardEntryFormValues,
  entry: GoldenBoardEntry | null
): GoldenBoardEntryUpsertRequest {
  const payload: GoldenBoardEntryUpsertRequest = {
    rank: values.rank ?? 0,
    displayName: values.displayName?.trim() ?? "",
    photoUrl: values.photoUrl?.trim() ?? "",
    headline: values.headline?.trim() ?? "",
    badgeLabel: values.badgeLabel?.trim() ?? "",
    lines: normalizeLines(values.lines),
    active: values.active ?? true,
  };

  // Gỡ link chỉ có nghĩa khi SỬA một dòng đang có tài khoản; lúc tạo mới thì không có gì để gỡ.
  const unlink = Boolean(values.unlinkUser) && Boolean(entry?.userId);
  if (unlink) {
    payload.unlinkUser = true;
    return payload;
  }

  const userId = values.userId?.trim();
  if (userId) {
    payload.userId = userId;
  }
  return payload;
}

/** Bỏ dòng trống, cắt khoảng trắng, cắt trần 3 dòng — soi gương `normalizeLines` của BE. */
export function normalizeLines(lines: (string | undefined)[] | undefined): string[] {
  if (!lines) return [];
  return lines
    .map((l) => l?.trim() ?? "")
    .filter((l) => l.length > 0)
    .slice(0, MAX_ACHIEVEMENT_LINES);
}

/**
 * Sau khi lưu, dòng này có còn gắn tài khoản không? Nguồn của luật "không có tài khoản thì BẮT
 * BUỘC có tên hiển thị" (service ném GOLDEN_BOARD_VALIDATION, DB có CHECK ck_golden_board_identity)
 * — kiểm ở client để admin thấy lỗi ngay trên ô, thay vì phát hiện qua một cú 400.
 *
 * Lưu ý ô userId để trống khi SỬA: link cũ vẫn được giữ (PUT bán phần) nên dòng vẫn có tài khoản.
 */
export function willHaveLinkedUser(
  values: GoldenBoardEntryFormValues,
  entry: GoldenBoardEntry | null
): boolean {
  if (values.unlinkUser && entry?.userId) return false;
  if (values.userId?.trim()) return true;
  return Boolean(entry?.userId);
}
