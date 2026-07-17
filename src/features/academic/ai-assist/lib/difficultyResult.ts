// Đọc result job DIFFICULTY (BE ai-service) → nội dung markdown + model attribution để panel render.
//
// DIFFICULTY_ANALYSIS đi qua generic handler của worker (AiJobWorker.generic) → result
// `{ output: "<text/markdown>", model: "<model>" }`. Nhưng model có thể trả structured khác,
// nên parse PHÒNG THỦ: chấp nhận string thô, object có field markdown quen thuộc, hoặc structured
// lạ (fallback in JSON code-block để vẫn thấy được). Pure/không side-effect để test đơn vị.

/** Kết quả đã bóc để panel hiển thị. `markdown` luôn có (rỗng nếu result trống). */
export interface DifficultyView {
  markdown: string;
  model?: string;
}

/** Các khoá text markdown thường gặp (generic BE dùng `output`). */
const CONTENT_KEYS = ["output", "content", "text", "analysis", "markdown", "result", "message"];
/** Các khoá model attribution thường gặp. */
const MODEL_KEYS = ["model", "modelUsed", "servingModel", "model_used", "serving_model"];

function firstString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

/**
 * Bóc result đã parse (JobView.result đã qua parseJobResult: string thô hoặc object) →
 * { markdown, model }. Object không có field text quen thuộc → in JSON đẹp trong code-block
 * (không nuốt output structured của model). Model đọc riêng để hiện Tag attribution.
 */
export function readDifficultyResult(result: unknown): DifficultyView {
  if (result == null) return { markdown: "" };

  if (typeof result === "string") {
    return { markdown: result.trim() };
  }

  if (typeof result === "object") {
    const obj = result as Record<string, unknown>;
    const model = firstString(obj, MODEL_KEYS);
    const content = firstString(obj, CONTENT_KEYS);
    if (content !== undefined) {
      return { markdown: content, model };
    }
    // Structured lạ: in nguyên (bỏ model khỏi phần JSON để tránh lặp attribution).
    const { model: _m, modelUsed: _mu, servingModel: _sm, ...rest } = obj as Record<string, unknown>;
    const body = Object.keys(rest).length > 0 ? rest : obj;
    return { markdown: "```json\n" + JSON.stringify(body, null, 2) + "\n```", model };
  }

  return { markdown: String(result) };
}
