import { describe, expect, it } from "vitest";
import { readDifficultyResult } from "./difficultyResult";

// Task 3.2/4.3 — admin-lecturer-ai-assist: bóc result job DIFFICULTY (tái dùng ở mentor)
// phòng thủ: string thô | {output,model} generic BE | structured lạ → JSON code-block.

describe("readDifficultyResult", () => {
  it("string thô → markdown trim, không model", () => {
    expect(readDifficultyResult("  ## Phân tích\nĐộ khó: trung bình  ")).toEqual({
      markdown: "## Phân tích\nĐộ khó: trung bình",
    });
  });

  it("{output, model} của generic handler BE → markdown + model attribution", () => {
    expect(
      readDifficultyResult({ output: "## Kết quả", model: "openrouter/auto" })
    ).toEqual({ markdown: "## Kết quả", model: "openrouter/auto" });
  });

  it("field text quen khác (content/text/analysis) + model key khác (modelUsed) vẫn bóc được", () => {
    expect(readDifficultyResult({ analysis: "khó", modelUsed: "m1" })).toEqual({
      markdown: "khó",
      model: "m1",
    });
  });

  it("structured lạ → in JSON code-block (không nuốt output), model tách riêng không lặp", () => {
    const view = readDifficultyResult({ score: 7, buckets: ["easy"], model: "m2" });
    expect(view.model).toBe("m2");
    expect(view.markdown.startsWith("```json\n")).toBe(true);
    expect(view.markdown).toContain('"score": 7');
    expect(view.markdown).not.toContain('"model"');
  });

  it("null/undefined → markdown rỗng (panel hiện trạng thái trống, không ném)", () => {
    expect(readDifficultyResult(null)).toEqual({ markdown: "" });
    expect(readDifficultyResult(undefined)).toEqual({ markdown: "" });
  });

  it("kiểu nguyên thuỷ khác → String() (không crash)", () => {
    expect(readDifficultyResult(42)).toEqual({ markdown: "42" });
  });
});
