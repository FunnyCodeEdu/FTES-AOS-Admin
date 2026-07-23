import { useMe } from "../../../auth/api";
import { hasScopedPermission } from "../../../../shared/permissions";
import { useTeachingCourses } from "../../../instructor-workspace/api/courseScopes";

export function useCanManageCourse(courseId: string | undefined): boolean {
  const { data: me } = useMe();
  // Ownership qua instructor_id KHÔNG nằm trong permissions/scopedGrants — BE requireManage vẫn
  // cho owner (CatalogService). Thiếu nhánh này editor read-only với CHÍNH chủ khoá (E2E
  // 2026-07-23: instructor.test mở lesson khoá mình sở hữu, nút Trợ lý AI/Lưu disabled).
  // /courses/teaching ép owner theo JWT ở BE → membership = ownership, không tin dữ liệu client.
  const { data: teaching } = useTeachingCourses();
  if (!courseId || !me) return false;
  const permissions = new Set(me.permissions);
  if (permissions.has("course.manage")) return true;
  if (teaching?.some((c) => c.id === courseId)) return true;
  return hasScopedPermission(
    me.scopedGrants,
    "course.manage",
    "COURSE",
    courseId
  );
}
