import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import type { GrantablePermission } from "../shared/types";

const queryKeys = {
  grantablePermissions: ["ctv", "grantable-permissions"] as const,
};

const mockGrantablePermissions: GrantablePermission[] = [
  { key: "community.report.view", description: "Xem report", scopeTypes: ["GROUP"] },
  { key: "community.report.resolve", description: "Xử lý report", scopeTypes: ["GROUP"] },
  { key: "community.post.moderate", description: "Duyệt/từ chối bài viết", scopeTypes: ["GROUP"] },
  { key: "resource.view", description: "Xem học liệu", scopeTypes: ["SUBJECT", "RESOURCE_SET"] },
  { key: "resource.approve", description: "Duyệt học liệu", scopeTypes: ["SUBJECT", "RESOURCE_SET"] },
];

export function useGrantablePermissions() {
  return useQuery<GrantablePermission[], Error>({
    queryKey: queryKeys.grantablePermissions,
    queryFn: async () => {
      void apiClient;
      return [...mockGrantablePermissions];
    },
    staleTime: 10 * 60 * 1000,
  });
}
