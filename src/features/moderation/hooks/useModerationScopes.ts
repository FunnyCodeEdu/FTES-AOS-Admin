import { useEffect, useMemo } from "react";
import { useMe } from "../../auth/api";
import { hasScopedPermission } from "../../../shared/permissions";
import { useModerationScopeStore } from "../store/moderationScopeStore";

export function useModerationScopes() {
  const { data: me } = useMe();
  const { selectedScopeId, setSelectedScopeId } = useModerationScopeStore();

  const activeScopes = useMemo(() => {
    const grants = me?.scopedGrants ?? [];
    const ids = new Set<string>();
    grants.forEach((g) => {
      if (g.scopeId && hasScopedPermission(grants, "community.report.view", g.scopeType, g.scopeId)) {
        ids.add(g.scopeId);
      }
    });
    return Array.from(ids);
  }, [me?.scopedGrants]);

  // Auto-apply a single available scope so a CTV with one group scope never sees the global queue.
  useEffect(() => {
    if (activeScopes.length === 1 && selectedScopeId !== activeScopes[0]) {
      setSelectedScopeId(activeScopes[0]);
    }
  }, [activeScopes, selectedScopeId, setSelectedScopeId]);

  const effectiveScopeId = activeScopes.length === 1 ? activeScopes[0] : (selectedScopeId ?? undefined);

  return { activeScopes, selectedScopeId, setSelectedScopeId, effectiveScopeId };
}
