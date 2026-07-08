import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import { queryClient } from "../../../shared/api/queryClient";
import type {
  AiInsightRow,
  ModelCatalog,
  ModelConfig,
  UpdateModelConfigRequest,
} from "../types";

// BE shape (AdminController GET /api/v1/ai/admin/insights → ApiResponse<Insights>,
// envelope đã được interceptor bóc → r.data = object dưới đây, KHÔNG phải mảng):
//   Insights { windowDays, perFeature: FeatureInsight[], totalTokens, estimatedCostUsd }
//   FeatureInsight { feature, requests, failed, errorRate, tokenInput, tokenOutput, estimatedCostUsd }
export interface AiInsights {
  windowDays: number;
  rows: AiInsightRow[];
  totalTokens: number;
  estimatedCostUsd: number;
}

// AI endpoints nằm dưới /api/v1/ai, khác base mặc định (/api/v1/admin) của apiClient.
// Override baseURL per-request để vẫn dùng interceptor (auth + unwrap envelope).
const AI_BASE = `${import.meta.env.VITE_API_BASE_URL ?? ""}/api/v1/ai`;

function toNumber(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : (value as number);
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

// Đọc phòng thủ: field name có thể lệch nhẹ giữa các phiên bản BE.
// BE hiện dùng tokenInput/tokenOutput (record FeatureInsight) — để đầu danh sách alias.
function normalizeInsight(raw: Record<string, unknown>): AiInsightRow {
  return {
    feature: String(raw.feature ?? "-"),
    requests: toNumber(raw.requests ?? raw.requestCount ?? raw.total),
    inputTokens: toNumber(raw.tokenInput ?? raw.inputTokens ?? raw.promptTokens ?? raw.tokensIn),
    outputTokens: toNumber(raw.tokenOutput ?? raw.outputTokens ?? raw.completionTokens ?? raw.tokensOut),
    errorRate: toNumber(raw.errorRate ?? raw.errors),
    estimatedCostUsd: toNumber(raw.estimatedCostUsd ?? raw.costUsd ?? raw.estimatedCost),
  };
}

// --- Model configs ---

export function useModelConfigs() {
  return useQuery<ModelConfig[], Error>({
    queryKey: ["ai", "model-configs"],
    queryFn: () =>
      apiClient
        .get("/admin/model-configs", { baseURL: AI_BASE })
        .then((r) => (r.data as ModelConfig[]) ?? []),
  });
}

export function useUpdateModelConfig() {
  return useMutation<
    ModelConfig,
    Error,
    { feature: string; body: UpdateModelConfigRequest }
  >({
    mutationFn: ({ feature, body }) =>
      apiClient
        .put(`/admin/model-configs/${feature}`, body, { baseURL: AI_BASE })
        .then((r) => r.data as ModelConfig),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "model-configs"] });
    },
  });
}

// --- Model catalog ---

export function useModelCatalog() {
  return useQuery<ModelCatalog, Error>({
    queryKey: ["ai", "models"],
    queryFn: () =>
      apiClient
        .get("/models", { baseURL: AI_BASE })
        .then((r) => r.data as ModelCatalog),
    staleTime: 10 * 60 * 1000,
  });
}

// --- Insights ---

export function useAiInsights() {
  return useQuery<AiInsights, Error>({
    queryKey: ["ai", "insights"],
    queryFn: () =>
      apiClient.get("/admin/insights", { baseURL: AI_BASE }).then((r) => {
        // r.data = object Insights (interceptor đã bóc envelope). KHÔNG phải mảng.
        const d = (r.data ?? {}) as {
          windowDays?: unknown;
          perFeature?: Record<string, unknown>[];
          totalTokens?: unknown;
          estimatedCostUsd?: unknown;
        };
        return {
          windowDays: toNumber(d.windowDays),
          rows: (d.perFeature ?? []).map(normalizeInsight),
          totalTokens: toNumber(d.totalTokens),
          estimatedCostUsd: toNumber(d.estimatedCostUsd),
        };
      }),
    staleTime: 60 * 1000,
  });
}
