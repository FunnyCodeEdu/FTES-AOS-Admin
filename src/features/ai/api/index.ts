import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import { queryClient } from "../../../shared/api/queryClient";
import type {
  AiInsightRow,
  ModelCatalog,
  ModelConfig,
  ModelTier,
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
  /** false = có feature tiêu token nhưng chưa tra được giá → TỔNG đang thiếu, phải nói rõ với người xem. */
  pricesComplete: boolean;
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
    modelName: (raw.modelName as string | null) ?? null,
    promptPer1k: toNumber(raw.promptPer1k),
    completionPer1k: toNumber(raw.completionPer1k),
    // Mặc định FALSE khi BE cũ chưa trả field: thà hiện "chưa rõ giá" còn hơn khẳng định một con
    // số 0 là chi phí thật.
    priceKnown: raw.priceKnown === true,
  };
}

// --- Model configs ---

/**
 * BE trả `params` là CHUỖI JSON (cột jsonb map thẳng sang String) còn UI cần object, và trả trạng
 * thái dưới cả hai tên `active`/`isActive`. Chuẩn hoá một lần ở đây thay vì rải `JSON.parse` +
 * `?? isActive` khắp component.
 */
function normalizeConfig(raw: Record<string, unknown>): ModelConfig {
  let params: ModelConfig["params"];
  const rawParams = raw.params;
  if (typeof rawParams === "string" && rawParams.trim()) {
    try {
      params = JSON.parse(rawParams);
    } catch {
      params = undefined; // params hỏng KHÔNG được làm sập cả bảng cấu hình
    }
  } else if (rawParams && typeof rawParams === "object") {
    params = rawParams as ModelConfig["params"];
  }
  const active =
    typeof raw.active === "boolean"
      ? raw.active
      : typeof raw.isActive === "boolean"
        ? raw.isActive
        : false;
  return {
    feature: String(raw.feature ?? "-"),
    providerKey: String(raw.providerKey ?? ""),
    modelName: String(raw.modelName ?? ""),
    fallbackProviderKey: (raw.fallbackProviderKey as string | null) ?? null,
    fallbackModelName: (raw.fallbackModelName as string | null) ?? null,
    params,
    active,
    isActive: active,
    lockedBehavior: (raw.lockedBehavior as ModelConfig["lockedBehavior"]) ?? "DOWNGRADE",
    minSpendVnd: toNumber(raw.minSpendVnd),
  };
}

export function useModelConfigs() {
  return useQuery<ModelConfig[], Error>({
    queryKey: ["ai", "model-configs"],
    queryFn: () =>
      apiClient
        .get("/admin/model-configs", { baseURL: AI_BASE })
        .then((r) =>
          ((r.data as Record<string, unknown>[]) ?? []).map(normalizeConfig)
        ),
  });
}

// --- Mốc chi tiêu theo model ---

export function useModelTiers() {
  return useQuery<ModelTier[], Error>({
    queryKey: ["ai", "model-tiers"],
    queryFn: () =>
      apiClient
        .get("/admin/model-tiers", { baseURL: AI_BASE })
        .then((r) => (r.data as ModelTier[]) ?? []),
  });
}

export function useUpsertModelTier() {
  return useMutation<
    ModelTier,
    Error,
    { modelName: string; minSpendVnd: number; label?: string; note?: string }
  >({
    // modelName đi trong BODY, KHÔNG phải path: model id chứa "/" (google/gemini-3.1-flash-lite)
    // và Tomcat chặn %2F trong đường dẫn theo mặc định → 400 HTML trước khi tới controller.
    mutationFn: (body) =>
      apiClient
        .put("/admin/model-tiers", body, { baseURL: AI_BASE })
        .then((r) => r.data as ModelTier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "model-tiers"] });
      queryClient.invalidateQueries({ queryKey: ["ai", "model-configs"] });
    },
  });
}

export function useDeleteModelTier() {
  return useMutation<void, Error, string>({
    mutationFn: (modelName) =>
      apiClient
        .delete("/admin/model-tiers", { baseURL: AI_BASE, params: { modelName } })
        .then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "model-tiers"] });
      queryClient.invalidateQueries({ queryKey: ["ai", "model-configs"] });
    },
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
          pricesComplete: (d as { pricesComplete?: unknown }).pricesComplete !== false,
        };
      }),
    staleTime: 60 * 1000,
  });
}
