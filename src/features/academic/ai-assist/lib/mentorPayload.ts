// Chuẩn hoá input tự do (signals / metrics) mà mentor tự dựng → payload gửi BE MentorController.
//
// BE nhận `signals`/`metrics` là JSON tự do (copyIfPresent, không ép schema). Mentor có thể gõ:
//   - JSON hợp lệ (object/array) → gửi nguyên cấu trúc (ai-service tận dụng được structure);
//   - văn bản thường (gạch đầu dòng, mô tả) → gửi như string.
// Ô rỗng → undefined (BE bỏ qua field). Pure/không side-effect để test đơn vị.

/**
 * Bóc input tự do thành giá trị gửi kèm. Trả `undefined` nếu rỗng (không thêm field).
 * Thử parse JSON khi chuỗi mở đầu bằng `{`/`[`; parse lỗi → giữ nguyên chuỗi (không ném).
 */
export function parseFreeSignal(raw: string | undefined): unknown {
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const looksLikeJson = trimmed.startsWith("{") || trimmed.startsWith("[");
  if (looksLikeJson) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Không phải JSON hợp lệ → gửi như văn bản thường (mentor gõ tay, không ép họ đúng cú pháp).
      return trimmed;
    }
  }
  return trimmed;
}
