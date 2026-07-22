import { describe, expect, it } from "vitest";
import { buildCreateQuestionBody, type QuestionForm } from "./QuizComposerDrawer";

// Task 2.4 — admin-lesson-exercise-authoring: build payload câu hỏi quiz từ form
// (key A..F theo vị trí, correctKeys từ ô tick, chặn vi phạm ràng buộc TRƯỚC khi bắn request).

function form(over: Partial<QuestionForm>): QuestionForm {
  return {
    question: "2 + 2 = ?",
    type: "SINGLE_CHOICE",
    options: [
      { text: "3", correct: false },
      { text: "4", correct: true },
    ],
    ...over,
  };
}

describe("buildCreateQuestionBody", () => {
  it("SINGLE_CHOICE hợp lệ → body đủ field, key theo vị trí, sortOrder từ caller", () => {
    const built = buildCreateQuestionBody(form({ explanation: "vì 2+2=4", points: 2 }), 5);
    expect(built.error).toBeUndefined();
    expect(built.body).toEqual({
      question: "2 + 2 = ?",
      type: "SINGLE_CHOICE",
      options: [
        { key: "A", text: "3" },
        { key: "B", text: "4" },
      ],
      correctKeys: ["B"],
      explanation: "vì 2+2=4",
      points: 2,
      sortOrder: 5,
    });
  });

  it("explanation rỗng → undefined; points thiếu → mặc định 1", () => {
    const built = buildCreateQuestionBody(form({ explanation: "" }), 0);
    expect(built.body?.explanation).toBeUndefined();
    expect(built.body?.points).toBe(1);
  });

  it("MULTIPLE_CHOICE nhiều ô tick → đủ correctKeys", () => {
    const built = buildCreateQuestionBody(
      form({
        type: "MULTIPLE_CHOICE",
        options: [
          { text: "2", correct: true },
          { text: "3", correct: false },
          { text: "4", correct: true },
        ],
      }),
      0
    );
    expect(built.body?.correctKeys).toEqual(["A", "C"]);
  });

  it("SINGLE_CHOICE tick 2 ô → error, KHÔNG có body (không bắn request)", () => {
    const built = buildCreateQuestionBody(
      form({
        options: [
          { text: "3", correct: true },
          { text: "4", correct: true },
        ],
      }),
      0
    );
    expect(built.body).toBeUndefined();
    expect(built.error).toBe("Câu này chỉ được chọn đúng 1 đáp án đúng");
  });

  it("MULTIPLE_CHOICE không tick ô nào → error", () => {
    const built = buildCreateQuestionBody(
      form({
        type: "MULTIPLE_CHOICE",
        options: [
          { text: "a", correct: false },
          { text: "b", correct: false },
        ],
      }),
      0
    );
    expect(built.error).toBe("Câu nhiều đáp án cần ít nhất 1 đáp án đúng");
  });

  it("quá 6 option → key rơi về số 1-based (lưới an toàn ngoài UI)", () => {
    const built = buildCreateQuestionBody(
      form({
        type: "MULTIPLE_CHOICE",
        options: [
          { text: "1", correct: false },
          { text: "2", correct: false },
          { text: "3", correct: false },
          { text: "4", correct: false },
          { text: "5", correct: false },
          { text: "6", correct: false },
          { text: "7", correct: true },
        ],
      }),
      0
    );
    expect(built.body?.options[6]).toEqual({ key: "7", text: "7" });
    expect(built.body?.correctKeys).toEqual(["7"]);
  });
});
