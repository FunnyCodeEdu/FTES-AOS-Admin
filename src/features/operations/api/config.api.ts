import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import { useMe } from "../../auth/api";
import type { ConfigChange, ConfigEntry, ConfigGroup, ConfigValueType } from "../shared/types";

const queryKeys = {
  config: ["ops", "config"] as const,
  history: (key: string) => ["ops", "config", key, "history"] as const,
};

let mockConfig: ConfigGroup[] = [
  {
    group: "payment",
    entries: [
      { key: "payment.retry_limit", value: 3, type: "number", description: "Số lần retry thanh toán" },
      { key: "payment.timeout_seconds", value: 30, type: "number", description: "Timeout thanh toán (giây)" },
    ],
  },
  {
    group: "notification",
    entries: [
      { key: "notification.batch_size", value: 500, type: "number", description: "Kích thước batch gửi thông báo" },
      { key: "notification.dry_run", value: false, type: "boolean", description: "Chế độ dry-run" },
    ],
  },
];

const mockHistory: Record<string, ConfigChange[]> = {
  "payment.retry_limit": [
    { id: "ch-1", key: "payment.retry_limit", before: 2, after: 3, reason: "Tăng độ ổn định", actorName: "Admin", occurredAt: "2026-06-01T00:00:00Z" },
  ],
};

export function useConfig() {
  return useQuery<ConfigGroup[], Error>({
    queryKey: queryKeys.config,
    queryFn: async () => {
      void apiClient;
      return mockConfig.map((g) => ({ ...g, entries: g.entries.map((e) => ({ ...e })) }));
    },
  });
}

export interface UpdateConfigInput {
  key: string;
  value: unknown;
  type: ConfigValueType;
  reason: string;
}

export function useUpdateConfig() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  return useMutation<ConfigEntry, Error, UpdateConfigInput>({
    mutationFn: async ({ key, value, reason }) => {
      void apiClient;
      const group = mockConfig.find((g) => g.entries.some((e) => e.key === key));
      if (!group) throw new Error("Config key not found");
      const entry = group.entries.find((e) => e.key === key)!;
      const before = entry.value;
      entry.value = value;
      const change: ConfigChange = {
        id: `ch-${Date.now()}`,
        key,
        before,
        after: value,
        reason,
        actorName: me?.user.fullName ?? "Unknown",
        occurredAt: new Date().toISOString(),
      };
      mockHistory[key] = [change, ...(mockHistory[key] ?? [])];
      return { ...entry };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ops", "config"] });
    },
  });
}

export function useConfigHistory(key: string | undefined) {
  return useQuery<ConfigChange[], Error>({
    queryKey: queryKeys.history(key ?? ""),
    queryFn: async () => {
      void apiClient;
      return mockHistory[key ?? ""] ?? [];
    },
    enabled: !!key,
  });
}
