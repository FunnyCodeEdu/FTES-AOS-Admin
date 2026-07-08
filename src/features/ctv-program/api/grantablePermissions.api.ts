import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import type { GrantablePermission } from "../shared/types";

const queryKeys = {
  grantablePermissions: ["ctv", "grantable-permissions"] as const,
};

export function useGrantablePermissions() {
  return useQuery<GrantablePermission[], Error>({
    queryKey: queryKeys.grantablePermissions,
    queryFn: async () => {
      const res = await apiClient.get<GrantablePermission[]>("/ctv/grantable-permissions");
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
  });
}
