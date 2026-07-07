// Types cho AI Console. Field theo backend AI endpoints (/api/v1/ai).
// Một số field đọc phòng thủ (có thì dùng, không thì default) vì BE có thể đổi nhẹ.

// --- Model config (GET/PUT /ai/admin/model-configs) ---

export interface ModelConfigParams {
  limits?: {
    DAY?: number;
    MONTH?: number;
  };
  temperature?: number;
  [key: string]: unknown;
}

export interface ModelConfig {
  feature: string;
  providerKey: string;
  modelName: string;
  fallbackProviderKey?: string | null;
  fallbackModelName?: string | null;
  params?: ModelConfigParams;
  isActive: boolean;
}

export interface UpdateModelConfigRequest {
  providerKey: string;
  modelName: string;
  fallbackProviderKey?: string | null;
  fallbackModelName?: string | null;
  params?: ModelConfigParams;
  isActive: boolean;
}

// --- Model catalog (GET /ai/models) ---

export interface ModelCatalogItem {
  id: string;
  label: string;
  provider: string;
  vision?: boolean;
  default_for?: string[];
  pricing_hint?: string;
}

export interface ModelCatalogDefaults {
  chat?: string;
  vision?: string;
}

export interface ModelCatalog {
  models: ModelCatalogItem[];
  defaults: ModelCatalogDefaults;
}

// --- Insights (GET /ai/admin/insights) ---
// Field names may vary slightly, đọc phòng thủ ở tầng API/UI.

export interface AiInsightRow {
  feature: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  errorRate: number;
  estimatedCostUsd: number;
}
