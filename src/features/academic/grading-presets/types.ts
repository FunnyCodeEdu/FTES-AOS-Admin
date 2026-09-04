/** Bộ tiêu chí chấm đặt tên theo giảng viên (BE V398, change teacher-grading-preset). */

export interface RubricLine {
  criterion: string;
  description?: string | null;
  /** Điểm tối đa của RIÊNG tiêu chí này — tổng các dòng là thang điểm của bộ. */
  maxScore: number;
  orderNo: number;
}

export interface GradingPresetView {
  id: string;
  name: string;
  teacherName: string;
  teacherId?: string | null;
  subjectId?: string | null;
  subjectCode?: string | null;
  description?: string | null;
  /** Chuỗi gửi thẳng xuống model lúc chấm. */
  criteria: string;
  rubrics: RubricLine[];
  totalScore?: number | null;
  source: "MANUAL" | "IMPORT";
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}

/**
 * Đầu vào import. `id` bỏ trống ⇒ BE tra theo khoá tự nhiên (giảng viên + tên bộ): import lại cùng
 * một bộ là CẬP NHẬT chứ không đẻ bản thứ hai.
 */
export interface GradingPresetInput {
  id?: string | null;
  name: string;
  teacherName: string;
  teacherId?: string | null;
  subjectId?: string | null;
  subjectCode?: string | null;
  description?: string | null;
  criteria: string;
  rubrics: RubricLine[];
  status?: GradingPresetView["status"] | null;
}

export interface ApplyPresetResult {
  presetId: string;
  applied: number;
  /** Đề không tồn tại — BE cố ý không làm hỏng cả lượt áp vì một id sai. */
  skipped: string[];
}

export interface ApplyPresetBody {
  challengeIds?: string[];
  subjectId?: string;
  tagSlug?: string;
}
