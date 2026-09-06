/** Xuất mail học viên có lọc (BE change student-email-export). */

export type EnrollStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

export interface StudentEmailRow {
  userId: string;
  username: string;
  email: string;
  courseId: string;
  courseTitle: string;
  courseCode?: string | null;
  packageId?: string | null;
  packageName?: string | null;
  active: boolean;
  joinedAt?: string | null;
  /** `PACKAGE` = mua gói, `ENROLLMENT` = ghi danh thẳng (khoá LEGACY, cấp tay, khoá 0đ). */
  source: "PACKAGE" | "ENROLLMENT";
}

export interface StudentEmailExport {
  totalRows: number;
  /** Số người THẬT SỰ nhận thư — một người học N khoá vẫn chỉ là một địa chỉ. */
  distinctEmails: number;
  /** BE đã cắt bớt ở trần: bản đang cầm là bản THIẾU. */
  truncated: boolean;
  rows: StudentEmailRow[];
}

export interface StudentEmailQuery {
  courseIds?: string[];
  packageIds?: string[];
  status?: EnrollStatusFilter;
  /** ISO instant, tính từ (bao gồm). */
  from?: string;
  /** ISO instant, tính đến (KHÔNG bao gồm). */
  to?: string;
}
