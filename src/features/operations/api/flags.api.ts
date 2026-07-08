import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import { graphqlRequest } from "../../../shared/api/graphql";
import { handleAdminMutationError } from "../../../shared/api/errors";

// BE shape (schema.graphqls + AdminPlatformReadController.featureFlags):
//   type AdminFeatureFlag { key: String!, enabled: Boolean!, description: String }
//   query featureFlags: [AdminFeatureFlag!]!   ← FLAT, KHÔNG có envs/rollout/segment.
const FEATURE_FLAGS_QUERY = `query FeatureFlags {
  featureFlags {
    key
    enabled
    description
  }
}`;

export interface FlagItem {
  key: string;
  enabled: boolean;
  description: string | null;
}

const queryKeys = {
  flags: ["ops", "flags"] as const,
};

export function useFlags() {
  return useQuery<FlagItem[], Error>({
    queryKey: queryKeys.flags,
    queryFn: () =>
      graphqlRequest<{ featureFlags: FlagItem[] }>(FEATURE_FLAGS_QUERY).then((r) => r.featureFlags),
  });
}

export interface UpdateFlagInput {
  key: string;
  enabled: boolean;
  value?: string | null;
}

export function useUpdateFlag() {
  const qc = useQueryClient();
  return useMutation<FlagItem, Error, UpdateFlagInput>({
    mutationFn: async ({ key, enabled, value }) => {
      const res = await apiClient.put(`/feature-flags/${key}`, { enabled, value });
      return res.data as FlagItem;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.flags }),
    onError: handleAdminMutationError,
  });
}
