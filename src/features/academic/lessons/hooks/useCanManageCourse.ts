import { useMe } from "../../../auth/api";
import { hasScopedPermission } from "../../../../shared/permissions";

export function useCanManageCourse(courseId: string | undefined): boolean {
  const { data: me } = useMe();
  if (!courseId || !me) return false;
  const permissions = new Set(me.permissions);
  if (permissions.has("course.manage")) return true;
  return hasScopedPermission(
    me.scopedGrants,
    "course.manage",
    "COURSE",
    courseId
  );
}
