import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coreClient } from "../../../../shared/api/client";
import { handleAdminMutationError } from "../../../../shared/api/errors";

/**
 * Kỹ năng nghề nghiệp gắn với khoá học ("khoá này dạy những kỹ năng gì").
 *
 * Hợp đồng BE (module career, làm SONG SONG — chưa deploy lúc viết file này):
 *   GET  /api/v1/career/skills                       → danh mục kỹ năng dùng chung
 *   GET  /api/v1/career/courses/{courseId}/skills    → các kỹ năng khoá đang dạy
 *   PUT  /api/v1/career/courses/{courseId}/skills    → THAY THẾ TOÀN BỘ danh sách, quyền `career.manage`
 *
 * Dùng `coreClient` (base `/api/v1`) chứ KHÔNG phải `apiClient` (base `/api/v1/admin`): nhóm
 * endpoint career nằm ngoài tiền tố `/admin`. Envelope `{code,message,data}` đã được interceptor
 * bóc sẵn thành `r.data`.
 */

/** Một kỹ năng trong danh mục dùng chung. */
export interface CareerSkill {
  id: string;
  slug: string;
  name: string;
  /** Nhóm kỹ năng (vd "Backend", "Kỹ năng mềm"). BE có thể trả null. */
  category?: string | null;
}

/** Liên kết kỹ năng ↔ khoá học (một dòng trong bảng cấu hình). */
export interface CourseSkillLink {
  skillId: string;
  /** Trọng số đóng góp của khoá vào kỹ năng, 0–1. */
  weight: number;
  /** Mức độ mục tiêu đạt được sau khoá, 1–5. */
  targetLevel: number;
  /** % hoàn thành khoá để ghi nhận / mở khoá kỹ năng, 0–100. */
  unlockAtPercent: number;
}

/**
 * Giá trị mặc định cho dòng mới — admin chọn kỹ năng xong là lưu được ngay, không phải điền gì.
 * unlock 100% = chỉ ghi nhận khi học xong khoá (an toàn nhất, admin muốn mở sớm thì tự hạ xuống).
 */
export const DEFAULT_SKILL_WEIGHT = 0.5;
export const DEFAULT_SKILL_TARGET_LEVEL = 3;
export const DEFAULT_SKILL_UNLOCK_AT_PERCENT = 100;

export const courseSkillsKeys = {
  all: ["career", "course-skills"] as const,
  catalog: () => ["career", "skills"] as const,
  byCourse: (courseId: string | undefined) =>
    [...courseSkillsKeys.all, courseId ?? "none"] as const,
};

/**
 * BE có thể trả mảng phẳng HOẶC bọc phân trang `{items:[...]}` (danh mục kỹ năng dùng chung dễ
 * được phân trang về sau). Chuẩn hoá tại MỘT chỗ để component luôn nhận mảng.
 */
function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const items = (data as { items?: unknown } | null)?.items;
  return Array.isArray(items) ? (items as T[]) : [];
}

/** Danh mục kỹ năng dùng chung — nguồn cho ô chọn kỹ năng. */
export function useCareerSkills(enabled = true) {
  return useQuery<CareerSkill[], Error>({
    queryKey: courseSkillsKeys.catalog(),
    enabled,
    queryFn: () => coreClient.get("/career/skills").then((r) => toArray<CareerSkill>(r.data)),
    // Danh mục ít đổi — giữ 5 phút để chuyển tab không gọi lại.
    staleTime: 5 * 60 * 1000,
  });
}

/** Các kỹ năng khoá đang dạy (cấu hình hiện tại). */
export function useCourseSkills(courseId: string | undefined) {
  return useQuery<CourseSkillLink[], Error>({
    queryKey: courseSkillsKeys.byCourse(courseId),
    enabled: Boolean(courseId),
    queryFn: () =>
      coreClient
        .get(`/career/courses/${courseId}/skills`)
        .then((r) => toArray<CourseSkillLink>(r.data)),
  });
}

/**
 * Lưu cấu hình: PUT gửi CẢ danh sách, BE thay thế toàn bộ (dòng bị gỡ khỏi UI = bị xoá ở BE).
 * Body là mảng trần đúng theo hợp đồng.
 */
export function useSaveCourseSkills(courseId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<CourseSkillLink[], Error, CourseSkillLink[]>({
    mutationFn: (links) =>
      coreClient
        .put(`/career/courses/${courseId}/skills`, links)
        .then((r) => toArray<CourseSkillLink>(r.data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: courseSkillsKeys.byCourse(courseId) });
    },
    onError: handleAdminMutationError,
  });
}
