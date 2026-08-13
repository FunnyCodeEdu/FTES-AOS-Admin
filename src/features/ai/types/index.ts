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

/** DOWNGRADE = hạ xuống model fallback; BLOCK = từ chối kèm lời mời nâng cấp. */
export type LockedBehavior = "DOWNGRADE" | "BLOCK";

export interface ModelConfig {
  feature: string;
  providerKey: string;
  modelName: string;
  fallbackProviderKey?: string | null;
  fallbackModelName?: string | null;
  /** BE trả JSON string (cột jsonb), không phải object — parse ở tầng api. */
  params?: ModelConfigParams;
  /**
   * Tên BE THẬT SỰ trả về: Jackson serialize `boolean isActive()` thành `active`.
   * `isActive` giữ lại làm alias vì BE trả cả hai; đọc `active` trước.
   * Trước khi sửa, FE chỉ đọc `isActive` nên MỌI dòng hiện "Tắt" dù DB `is_active = true`.
   */
  active: boolean;
  isActive?: boolean;
  lockedBehavior?: LockedBehavior;
  /** Mốc chi tiêu (VNĐ) của model chính; 0 = mở cho mọi người. */
  minSpendVnd?: number;
}

export interface UpdateModelConfigRequest {
  providerKey: string;
  modelName: string;
  fallbackProviderKey?: string | null;
  fallbackModelName?: string | null;
  params?: ModelConfigParams;
  isActive: boolean;
  lockedBehavior?: LockedBehavior;
}

/** Mốc chi tiêu theo model (`ai.model_tiers`). Không có dòng = model mở cho mọi người. */
export interface ModelTier {
  modelName: string;
  minSpendVnd: number;
  label?: string | null;
  note?: string | null;
}

// --- Model catalog (GET /ai/models) ---

export interface ModelCatalogItem {
  id: string;
  label: string;
  /** "openrouter" | "groq". Model Groq mang id tiền tố `groq:` và chỉ gồm những model OpenRouter KHÔNG có. */
  provider: string;
  vision?: boolean;
  default_for?: string[];
  /** BE trả object {prompt_per_1k, completion_per_1k, unit}, KHÔNG phải string. */
  pricing_hint?: {
    prompt_per_1k?: number;
    completion_per_1k?: number;
    unit?: string;
  };
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
  /** Model đang cấu hình cho feature — chi phí được tính theo ĐƠN GIÁ CỦA CHÍNH model này. */
  modelName?: string | null;
  /** USD/1k token vào. */
  promptPer1k: number;
  /** USD/1k token ra — thường đắt gấp nhiều lần chiều vào. */
  completionPer1k: number;
  /**
   * false = BE chưa tra được giá (ai-service down / model lạ). Khi đó `estimatedCostUsd` là 0 vì
   * KHÔNG BIẾT, không phải vì miễn phí — UI phải phân biệt hai thứ này.
   */
  priceKnown: boolean;
}
