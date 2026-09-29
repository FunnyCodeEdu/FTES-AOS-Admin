export const DEFAULT_LESSON_COLUMN_WIDTH = 400;
export const MIN_LESSON_COLUMN_WIDTH = 280;
export const MAX_LESSON_COLUMN_WIDTH = 760;

/** Chuẩn hoá độ rộng lưu trong localStorage hoặc nhận từ thao tác kéo. */
export function normalizeLessonColumnWidth(value: unknown): number {
  if (value == null || value === "") return DEFAULT_LESSON_COLUMN_WIDTH;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return DEFAULT_LESSON_COLUMN_WIDTH;
  return Math.min(
    MAX_LESSON_COLUMN_WIDTH,
    Math.max(MIN_LESSON_COLUMN_WIDTH, Math.round(numericValue))
  );
}
