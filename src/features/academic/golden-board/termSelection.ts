import type { TermView } from "../types";

/** So sánh kỳ theo thời điểm bắt đầu, tie-break code rồi id — soi gương `BY_START` của BE. */
function compareByStart(a: TermView, b: TermView): number {
  const sa = a.startsAt ?? "";
  const sb = b.startsAt ?? "";
  if (sa !== sb) return sa < sb ? -1 : 1;
  const ca = a.code ?? "";
  const cb = b.code ?? "";
  if (ca !== cb) return ca < cb ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Kỳ mới nhất đứng đầu — thứ tự của picker. */
export function sortTermsForPicker(terms: TermView[]): TermView[] {
  return [...terms].sort((a, b) => compareByStart(b, a));
}

/**
 * Kỳ mở sẵn khi vào trang. Đi theo luật "kỳ mới nhất" của {@code GoldenBoardService.pickLatest}
 * để console và trang chủ nói về cùng một kỳ: ưu tiên kỳ ACTIVE bắt đầu muộn nhất, không có thì
 * kỳ ĐÃ bắt đầu muộn nhất, cuối cùng mới đến kỳ tương lai gần nhất.
 *
 * KHÁC BE một điểm cố ý: BE chỉ xét tập kỳ ĐÃ CÓ bảng, còn console phải mở được cả kỳ chưa có
 * dòng nào (đó chính là lúc admin cần vào để soạn), nên ở đây xét MỌI kỳ.
 */
export function pickDefaultTermId(terms: TermView[], now: Date = new Date()): string | undefined {
  if (terms.length === 0) return undefined;
  const sorted = sortTermsForPicker(terms);

  const running = sorted.find((t) => t.status === "ACTIVE");
  if (running) return running.id;

  const nowIso = now.toISOString();
  const started = sorted.find((t) => !!t.startsAt && t.startsAt <= nowIso);
  if (started) return started.id;

  // Chỉ còn kỳ tương lai — lấy kỳ sắp tới GẦN NHẤT (phần tử cuối của thứ tự mới-nhất-trước).
  return sorted[sorted.length - 1]?.id;
}
