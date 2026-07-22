import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { coreClient } from "../../../shared/api/client";
import { useMe } from "../../auth/api";
import { hasScopedPermission } from "../../../shared/permissions";
import type { MyCourseScope, TeachingCourse } from "../shared/types";

const COURSE_SCOPE = "COURSE";

const teachingKeys = {
  all: ["instructor", "teaching"] as const,
};

/**
 * COURSE-scope của caller đọc từ `me.scopedGrants` (KHÔNG query — mirror useCtvScopes),
 * lọc `scopeType === "COURSE"` còn hiệu lực, gom permission theo scopeId.
 */
export function useMyCourseScopes() {
  const { data: me } = useMe();
  const grants = me?.scopedGrants ?? [];

  const scopes = useMemo(() => {
    const map = new Map<string, MyCourseScope>();
    grants.forEach((g) => {
      if (g.scopeType !== COURSE_SCOPE || !g.scopeId) return;
      if (!hasScopedPermission(grants, g.permission, g.scopeType, g.scopeId)) return;
      const existing = map.get(g.scopeId);
      if (existing) {
        if (!existing.permissions.includes(g.permission)) existing.permissions.push(g.permission);
      } else {
        map.set(g.scopeId, {
          scopeId: g.scopeId,
          scopeName: g.scopeId,
          permissions: [g.permission],
          expiresAt: g.expiresAt ?? "",
        });
      }
    });
    return Array.from(map.values());
  }, [grants]);

  return { scopes, isLoading: !me };
}

/** Khoá caller sở hữu (mọi trạng thái) — BE `GET /courses/teaching`, owner ép theo JWT. */
export function useTeachingCourses() {
  return useQuery<TeachingCourse[], Error>({
    queryKey: teachingKeys.all,
    queryFn: async () => {
      const res = await coreClient.get<TeachingCourse[]>("/courses/teaching", {
        params: { page: 0, size: 100 },
      });
      return res.data;
    },
    placeholderData: (previous) => previous,
  });
}
