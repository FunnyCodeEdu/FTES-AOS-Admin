import dayjs from "dayjs";

/**
 * challenge-testcase-editor §4.3 — hiển thị lịch mở/đóng của challenge.
 *
 * BE change `challenge-testcase-judge` (V305) bỏ NOT NULL trên `starts_at`/`ends_at`:
 *  - `startsAt == null` ⇒ mở NGAY (scheduler không chờ),
 *  - `endsAt == null`   ⇒ KHÔNG BAO GIỜ auto-CLOSE ("Không giới hạn").
 *
 * Dữ liệu CŨ dùng sentinel `2999-12-31` và BE cố tình KHÔNG migrate ngược (design §7) — về mặt
 * người dùng nó cũng là "không giới hạn", nên hiển thị y như `null` thay vì in ra năm 2999.
 */

export const NO_CLOSE_LABEL = "Không giới hạn";
export const OPEN_NOW_LABEL = "Mở ngay";

const DATE_FORMAT = "DD/MM/YYYY HH:mm";
/** Mọi mốc đóng từ năm này trở đi coi là sentinel "vô hạn" của dữ liệu cũ. */
const SENTINEL_CLOSE_YEAR = 2999;

/** Thời điểm đóng vắng mặt / không hợp lệ / là sentinel năm 2999 ⇒ challenge mở vô hạn. */
export function isUnlimitedClose(endsAt: string | null | undefined): boolean {
  if (!endsAt) return true;
  const d = dayjs(endsAt);
  if (!d.isValid()) return true;
  return d.year() >= SENTINEL_CLOSE_YEAR;
}

/** Nhãn riêng cho vế đóng (dùng ở cột bảng / mô tả ngắn). */
export function formatChallengeCloseTime(endsAt: string | null | undefined): string {
  return isUnlimitedClose(endsAt) ? NO_CLOSE_LABEL : dayjs(endsAt).format(DATE_FORMAT);
}

/** Nhãn "mở → đóng" đầy đủ; vắng mốc mở ⇒ "Mở ngay", vắng mốc đóng ⇒ "Không giới hạn". */
export function formatChallengeSchedule(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined
): string {
  const start = startsAt && dayjs(startsAt).isValid() ? dayjs(startsAt).format(DATE_FORMAT) : OPEN_NOW_LABEL;
  return `${start} → ${formatChallengeCloseTime(endsAt)}`;
}
