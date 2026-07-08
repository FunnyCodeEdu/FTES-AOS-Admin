import { useQuery } from "@tanstack/react-query";
import { graphqlRequest } from "../../../shared/api/graphql";

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

// TODO(be): feature flags hiện READ-ONLY. Không có GraphQL Mutation lẫn REST
// /flags/{key}/envs/{env} trên FTES-AOS-Backend để bật/tắt flag → bỏ useUpdateFlag
// (trước đây trỏ endpoint không tồn tại). Nối lại khi BE ship mutation toggle flag.
