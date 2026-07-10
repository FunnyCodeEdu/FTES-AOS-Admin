import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { coreClient } from "../../../shared/api/client";
import { useMe } from "../../auth/api";
import { hasScopedPermission } from "../../../shared/permissions";
import type { CtvKpi, CtvScope, CtvTodoItem } from "../shared/types";

const queryKeys = {
  scopes: ["ctv", "me", "scopes"] as const,
  todo: ["ctv", "me", "todo"] as const,
  kpi: (range: string) => ["ctv", "me", "kpi", range] as const,
};

export function useCtvScopes() {
  const { data: me } = useMe();
  const grants = me?.scopedGrants ?? [];

  const scopes = useMemo(() => {
    const map = new Map<string, CtvScope>();
    grants.forEach((g) => {
      if (!g.scopeId || !hasScopedPermission(grants, g.permission, g.scopeType, g.scopeId)) return;
      const key = `${g.scopeType}:${g.scopeId}`;
      const existing = map.get(key);
      if (existing) {
        existing.permissions.push(g.permission);
      } else {
        map.set(key, {
          scopeType: g.scopeType,
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

export function useCtvTodo() {
  return useQuery<CtvTodoItem[], Error>({
    queryKey: queryKeys.todo,
    queryFn: async () => {
      const res = await coreClient.get<CtvTodoItem[]>("/ctv/me/todo");
      return res.data;
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useCtvKpi(range: string = "30d") {
  return useQuery<CtvKpi, Error>({
    queryKey: queryKeys.kpi(range),
    queryFn: async () => {
      const res = await coreClient.get<CtvKpi>("/ctv/me/kpi", { params: { range } });
      return res.data;
    },
  });
}

export function useRefreshCtvMe() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["auth", "me"] });
    qc.invalidateQueries({ queryKey: ["ctv", "me", "scopes"] });
  };
}
