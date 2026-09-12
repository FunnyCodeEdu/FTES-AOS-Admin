import { describe, expect, it } from "vitest";
import { mcqViewsToRows } from "./McqQuestionManagerDrawer";

describe("mcqViewsToRows", () => {
  it("hydrate đúng đáp án, lời giải, điểm và sắp xếp theo orderNo", () => {
    expect(
      mcqViewsToRows([
        {
          id: "q2",
          question: "Câu 2",
          options: [{ key: "A", text: "Sai" }, { key: "B", text: "Đúng" }],
          correctKeys: ["B"],
          explanation: "Vì B đúng",
          points: 2,
          orderNo: 1,
        },
        {
          id: "q1",
          question: "Câu 1",
          options: [{ key: "A", text: "Đúng" }, { key: "B", text: "Sai" }],
          correctKeys: ["A"],
          explanation: null,
          points: 1,
          orderNo: 0,
        },
      ])
    ).toEqual([
      {
        question: "Câu 1",
        options: [{ text: "Đúng", correct: true }, { text: "Sai", correct: false }],
        explanation: "",
        points: 1,
      },
      {
        question: "Câu 2",
        options: [{ text: "Sai", correct: false }, { text: "Đúng", correct: true }],
        explanation: "Vì B đúng",
        points: 2,
      },
    ]);
  });
});
