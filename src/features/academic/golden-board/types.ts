// Bảng vàng (FTES Hall of Fame) theo KỲ HỌC — course-golden-board (BE V322).
// Endpoint admin: /api/v1/admin/golden-board/terms/{termIdOrCode}/entries (+ /entries/{id}).
// Gate MỘT leaf `goldenboard.manage` (ADMIN / SUPER_ADMIN / ADMIN_ACADEMIC).

/** Trần dòng thành tích — DB CHECK ck_golden_board_lines (cardinality <= 3) chặn lớp cuối. */
export const MAX_ACHIEVEMENT_LINES = 3;

/** Trần độ dài theo @Size của GoldenBoardEntryUpsertRequest (giữ đồng bộ với BE). */
export const GOLDEN_BOARD_LIMITS = {
  rankMin: 0,
  rankMax: 9999,
  displayName: 160,
  photoUrl: 2048,
  headline: 160,
  badgeLabel: 64,
  line: 500,
} as const;

/**
 * Shape khớp `AdminGoldenBoardEntryView` của BE.
 *
 * KHÁC view công khai: các field `displayName`/`photoUrl` ở đây là GIÁ TRỊ ĐÃ LƯU (raw), KHÔNG
 * phải giá trị đã resolve. Các thẻ `linked*` là ảnh chụp profile của tài khoản được link, chỉ để
 * console hiện "dòng này đang trỏ đúng ai" — TUYỆT ĐỐI không đổ ngược vào form sửa, kẻo mở một
 * dòng rồi bấm Lưu là ghi đè giá trị resolve lên ô vốn cố ý để trống.
 */
export interface GoldenBoardEntry {
  id: string;
  termId: string;
  rank: number;
  userId: string | null;
  linkedUsername: string | null;
  linkedDisplayName: string | null;
  linkedAvatarUrl: string | null;
  displayName: string | null;
  photoUrl: string | null;
  headline: string | null;
  badgeLabel: string | null;
  lines: string[];
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

/** Giá trị của antd Form (ô rỗng là "" chứ không phải null). */
export interface GoldenBoardEntryFormValues {
  rank?: number;
  userId?: string;
  /** Cờ tường minh "gỡ liên kết tài khoản" — xem docblock `buildGoldenBoardPayload`. */
  unlinkUser?: boolean;
  displayName?: string;
  photoUrl?: string;
  headline?: string;
  badgeLabel?: string;
  lines?: (string | undefined)[];
  active?: boolean;
}

/**
 * Body POST/PUT khớp `GoldenBoardEntryUpsertRequest`. PUT là BÁN PHẦN: field vắng/null = GIỮ
 * NGUYÊN, chuỗi rỗng = xoá field đó, mảng rỗng = xoá hết dòng thành tích.
 */
export interface GoldenBoardEntryUpsertRequest {
  rank?: number;
  userId?: string;
  unlinkUser?: boolean;
  displayName?: string;
  photoUrl?: string;
  headline?: string;
  badgeLabel?: string;
  lines?: string[];
  active?: boolean;
}

/** Tên hiện lên trang chủ: field đã lưu thắng, profile chỉ BÙ chỗ trống (đúng luật BE). */
export function resolvedDisplayName(entry: GoldenBoardEntry): string {
  return entry.displayName?.trim() || entry.linkedDisplayName?.trim() || entry.linkedUsername || "—";
}

/** Ảnh hiện lên trang chủ: cùng luật với `resolvedDisplayName`. */
export function resolvedPhotoUrl(entry: GoldenBoardEntry): string | undefined {
  return entry.photoUrl?.trim() || entry.linkedAvatarUrl?.trim() || undefined;
}
