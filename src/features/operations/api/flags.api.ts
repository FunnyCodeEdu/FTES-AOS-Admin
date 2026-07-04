import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import { useMe } from "../../auth/api";
import type { BroadcastSegment, Flag, FlagEnv, FlagEnvState } from "../shared/types";

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

export function useFlags() {
  return useQuery<Flag[], Error>({
    queryKey: queryKeys.flags,
    queryFn: async () => {
      void apiClient;
      return [...mockFlags];
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
      void apiClient;
      void me;
      const flag = mockFlags.find((f) => f.key === key);
      if (!flag) throw new Error("Flag not found");
      const next: FlagEnvState = { enabled, rolloutPercent };
      if (targetSegment) next.targetSegment = targetSegment;
      flag.envs[env] = next;
      // MOCK audit stub
      void reason;
      return flag;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops", "flags"] }),
  });
}
