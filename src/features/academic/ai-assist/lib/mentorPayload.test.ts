import { describe, expect, it } from "vitest";
import { parseFreeSignal } from "./mentorPayload";

// Task 4.3 — admin-lecturer-ai-assist: input tự do của mentor → payload BE (JSON|text).

describe("parseFreeSignal", () => {
  it("rỗng/chỉ whitespace/undefined → undefined (BE bỏ qua field)", () => {
    expect(parseFreeSignal(undefined)).toBeUndefined();
    expect(parseFreeSignal("")).toBeUndefined();
    expect(parseFreeSignal("   \n ")).toBeUndefined();
  });

  it("JSON object/array hợp lệ → gửi nguyên cấu trúc", () => {
    expect(parseFreeSignal('{"quizAvg": 45, "trend": "down"}')).toEqual({
      quizAvg: 45,
      trend: "down",
    });
    expect(parseFreeSignal('  [1, 2, 3] ')).toEqual([1, 2, 3]);
  });

  it("mở đầu như JSON nhưng hỏng → giữ nguyên chuỗi (không ném, không ép mentor đúng cú pháp)", () => {
    expect(parseFreeSignal("{quiz thấp, hay bỏ học")).toBe("{quiz thấp, hay bỏ học");
  });

  it("văn bản thường → trim rồi gửi như string", () => {
    expect(parseFreeSignal("  - điểm quiz giảm\n- ít nộp bài  ")).toBe(
      "- điểm quiz giảm\n- ít nộp bài"
    );
  });
});
