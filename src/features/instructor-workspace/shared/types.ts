// Payroll DTO của chính giảng viên dùng chung định nghĩa với admin payroll console
// (owner bị ép theo JWT ở BE) — nguồn duy nhất ở ../../payroll/types để không lệch nhau.
export type { Earning, EarningStatus, PayrollDeduction } from "../../payroll/types";

/** COURSE-scope gom từ `me.scopedGrants` (mirror CtvScope), tên khoá enrich từ /courses/teaching. */
export interface MyCourseScope {
  scopeId: string;
  scopeName: string;
  permissions: string[];
  expiresAt: string;
}

/** Khoá do caller sở hữu — BE `GET /courses/teaching` trả CourseSummary. */
export interface TeachingCourse {
  id: string;
  title: string;
  slugName: string;
  courseCode: string;
  level: string;
  status: string;
  saleMode: string;
  totalPrice: number | null;
  salePrice: number | null;
  totalUser: number;
  imageHeader: string | null;
  categoryId: string | null;
}
