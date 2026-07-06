import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import { graphqlRequest } from "../../../shared/api/graphql";
import { handleAdminMutationError } from "../../../shared/api/errors";
import { useMe } from "../../auth/api";
import type { BroadcastSegment, Flag, FlagEnv } from "../shared/types";

const FEATURE_FLAGS_QUERY = `query FeatureFlags {
  featureFlags {
    key
    description
    envs {
      dev { enabled rolloutPercent targetSegment { campusIds subjectIds roles } }
      staging { enabled rolloutPercent targetSegment { campusIds subjectIds roles } }
      prod { enabled rolloutPercent targetSegment { campusIds subjectIds roles } }
    }
  }
}`;

const queryKeys = {
  flags: ["ops", "flags"] as const,
};

const mockFlags: Flag[] = [
  {
    key: "new-checkout",
    description: "Luồng thanh toán mới",
    envs: {
      dev: { enabled: true, rolloutPercent: 100 },
      staging: { enabled: true, rolloutPercent: 50 },
      prod: { enabled: false, rolloutPercent: 0 },
    },
  },
];

const MOCK_ENABLED_FLAGS = false;

export function useFlags() {
  return useQuery<Flag[], Error>({
    queryKey: queryKeys.flags,
    queryFn: async () => {
      if (MOCK_ENABLED_FLAGS) {
        void apiClient;
        return [...mockFlags];
      }
      return graphqlRequest<{ featureFlags: Flag[] }>(FEATURE_FLAGS_QUERY).then((r) => r.featureFlags);
    },
  });
}

export interface UpdateFlagInput {
  key: string;
  env: FlagEnv;
  enabled: boolean;
  rolloutPercent: number;
  targetSegment?: BroadcastSegment;
  reason: string;
}

export function useUpdateFlag() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  return useMutation<Flag, Error, UpdateFlagInput>({
    mutationFn: async ({ key, env, enabled, rolloutPercent, targetSegment, reason }) => {
      void me;
      const res = await apiClient.put(`/flags/${key}/envs/${env}`, {
        enabled,
        rolloutPercent,
        targetSegment,
        reason,
      });
      return res.data as Flag;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops", "flags"] }),
    onError: handleAdminMutationError,
  });
}
