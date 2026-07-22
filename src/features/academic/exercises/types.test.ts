import { describe, expect, it } from "vitest";
import { validateCorrectKeys } from "./types";

// Task 2.4 — admin-lesson-exercise-authoring: ràng correctKeys theo type (mirror BE validate).

describe("validateCorrectKeys", () => {
  it("SINGLE_CHOICE: đúng 1 key mới hợp lệ", () => {
    expect(validateCorrectKeys("SINGLE_CHOICE", ["A"])).toBeNull();
    expect(validateCorrectKeys("SINGLE_CHOICE", [])).toBe(
      "Câu này chỉ được chọn đúng 1 đáp án đúng"
    );
    expect(validateCorrectKeys("SINGLE_CHOICE", ["A", "B"])).toBe(
      "Câu này chỉ được chọn đúng 1 đáp án đúng"
    );
  });

  it("TRUE_FALSE: cũng đúng 1 key", () => {
    expect(validateCorrectKeys("TRUE_FALSE", ["A"])).toBeNull();
    expect(validateCorrectKeys("TRUE_FALSE", ["A", "B"])).not.toBeNull();
  });

  it("MULTIPLE_CHOICE: >= 1 key", () => {
    expect(validateCorrectKeys("MULTIPLE_CHOICE", ["A"])).toBeNull();
    expect(validateCorrectKeys("MULTIPLE_CHOICE", ["A", "C"])).toBeNull();
    expect(validateCorrectKeys("MULTIPLE_CHOICE", [])).toBe(
      "Câu nhiều đáp án cần ít nhất 1 đáp án đúng"
    );
  });
});
