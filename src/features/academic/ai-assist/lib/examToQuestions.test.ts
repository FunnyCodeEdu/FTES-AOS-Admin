import { describe, expect, it } from "vitest";
import {
  inferQuestionType,
  mapExamQuestion,
  mapExamResult,
  normalizeCorrectKeys,
  normalizeOptions,
  previewToFormValues,
  readGeneratingModel,
  toQuizDifficulty,
  type ExamGenResult,
} from "./examToQuestions";

// Task 2.4 — admin-lecturer-ai-assist: map schema EXAM_GEN → câu hỏi quiz bank
// (options/answer_key do model sinh, KHÔNG cố định shape → chuẩn hoá phòng thủ).

describe("normalizeOptions", () => {
  it("string[] → key chữ cái theo vị trí", () => {
    expect(normalizeOptions(["Một", "Hai"])).toEqual([
      { key: "A", text: "Một" },
      { key: "B", text: "Hai" },
    ]);
  });

  it("{key,text}[] giữ key model trả", () => {
    expect(
      normalizeOptions([
        { key: "X", text: "Một" },
        { key: "Y", text: "Hai" },
      ])
    ).toEqual([
      { key: "X", text: "Một" },
      { key: "Y", text: "Hai" },
    ]);
  });

  it("object map {A: text} → entries; value số vẫn thành text", () => {
    expect(normalizeOptions({ A: "Một", B: 2 })).toEqual([
      { key: "A", text: "Một" },
      { key: "B", text: "2" },
    ]);
  });

  it("bỏ option text rỗng; key sau khi lọc đánh lại theo vị trí", () => {
    expect(normalizeOptions(["", "Đáp án"])).toEqual([{ key: "A", text: "Đáp án" }]);
  });

  it("key trùng → thay bằng chữ cái vị trí để correctKeys ổn định", () => {
    expect(
      normalizeOptions([
        { key: "A", text: "1" },
        { key: "A", text: "2" },
      ])
    ).toEqual([
      { key: "A", text: "1" },
      { key: "B", text: "2" },
    ]);
  });

  it("shape lạ (null/số) → []", () => {
    expect(normalizeOptions(null)).toEqual([]);
    expect(normalizeOptions(42)).toEqual([]);
  });
});

describe("normalizeCorrectKeys", () => {
  const options = normalizeOptions(["Một", "Hai", "Ba"]);

  it("key chữ cái không phân biệt hoa thường", () => {
    expect(normalizeCorrectKeys("b", options)).toEqual(["B"]);
  });

  it("khớp text đáp án", () => {
    expect(normalizeCorrectKeys("ba", options)).toEqual(["C"]);
  });

  it("số = index 0-based (cả number lẫn chuỗi số)", () => {
    expect(normalizeCorrectKeys(1, options)).toEqual(["B"]);
    expect(normalizeCorrectKeys("2", options)).toEqual(["C"]);
  });

  it('chuỗi "A,C" / "A;C" tách nhiều key, trả theo thứ tự options', () => {
    expect(normalizeCorrectKeys("C,A", options)).toEqual(["A", "C"]);
    expect(normalizeCorrectKeys("A; C", options)).toEqual(["A", "C"]);
  });

  it("mảng trộn dạng", () => {
    expect(normalizeCorrectKeys(["a", 2], options)).toEqual(["A", "C"]);
  });

  it("không khớp gì → []", () => {
    expect(normalizeCorrectKeys("Z", options)).toEqual([]);
    expect(normalizeCorrectKeys(undefined, options)).toEqual([]);
  });
});

describe("inferQuestionType", () => {
  it("type model trả hợp lệ được ưu tiên (chịu dấu cách/gạch ngang)", () => {
    expect(inferQuestionType("single-choice", 2)).toBe("SINGLE_CHOICE");
    expect(inferQuestionType("TRUE FALSE", 1)).toBe("TRUE_FALSE");
  });

  it("type lạ → suy theo số đáp án đúng", () => {
    expect(inferQuestionType("essay", 2)).toBe("MULTIPLE_CHOICE");
    expect(inferQuestionType(undefined, 1)).toBe("SINGLE_CHOICE");
    expect(inferQuestionType(undefined, 0)).toBe("SINGLE_CHOICE");
  });
});

describe("mapExamQuestion", () => {
  it("map đủ: prompt→content, answer_key→isCorrect, id giữ làm key", () => {
    const q = mapExamQuestion(
      {
        id: "q-7",
        type: "MULTIPLE_CHOICE",
        prompt: "Chọn số chẵn?",
        options: ["1", "2", "4"],
        answer_key: ["B", "C"],
        skill: "number-sense",
      },
      0
    );
    expect(q).toEqual({
      key: "q-7",
      content: "Chọn số chẵn?",
      type: "MULTIPLE_CHOICE",
      answers: [
        { id: "A", text: "1", isCorrect: false },
        { id: "B", text: "2", isCorrect: true },
        { id: "C", text: "4", isCorrect: true },
      ],
      skill: "number-sense",
    });
  });

  it("fallback field: question thay prompt, answerKey camelCase, key gen-idx khi thiếu id", () => {
    const q = mapExamQuestion(
      { question: "2+2?", options: ["3", "4"], answerKey: "4" },
      3
    );
    expect(q?.key).toBe("gen-3");
    expect(q?.content).toBe("2+2?");
    expect(q?.answers.find((a) => a.isCorrect)?.text).toBe("4");
  });

  it("thiếu prompt hoặc <2 đáp án → null (bỏ, không ném)", () => {
    expect(mapExamQuestion({ options: ["a", "b"] }, 0)).toBeNull();
    expect(mapExamQuestion({ prompt: "x", options: ["chỉ 1"] }, 0)).toBeNull();
  });
});

describe("mapExamResult + readGeneratingModel", () => {
  const result: ExamGenResult = {
    model: " openrouter/auto ",
    questions: [
      { prompt: "Q1", options: ["a", "b"], answer_key: "A" },
      { prompt: "", options: ["a", "b"] }, // hỏng → bỏ
      { prompt: "Q2", options: ["a", "b", "c"], answer_key: [0, 2] },
    ],
  };

  it("bỏ câu không hợp lệ, giữ thứ tự câu dùng được", () => {
    const qs = mapExamResult(result);
    expect(qs.map((q) => q.content)).toEqual(["Q1", "Q2"]);
    expect(qs[1].type).toBe("MULTIPLE_CHOICE");
  });

  it("result rỗng/không mảng → []", () => {
    expect(mapExamResult(undefined)).toEqual([]);
    expect(mapExamResult({} as ExamGenResult)).toEqual([]);
  });

  it("readGeneratingModel trim, rỗng → undefined", () => {
    expect(readGeneratingModel(result)).toBe("openrouter/auto");
    expect(readGeneratingModel({ model: "  " })).toBeUndefined();
    expect(readGeneratingModel(undefined)).toBeUndefined();
  });
});

describe("previewToFormValues + toQuizDifficulty", () => {
  it("câu giữ lại LUÔN vào status draft (giảng viên rà lại), skill → tags", () => {
    const form = previewToFormValues(
      {
        key: "gen-0",
        content: "Q",
        type: "SINGLE_CHOICE",
        answers: [
          { id: "A", text: "1", isCorrect: true },
          { id: "B", text: "2", isCorrect: false },
        ],
        skill: "algebra",
      },
      "easy",
      "subj-1"
    );
    expect(form.status).toBe("draft");
    expect(form.tags).toEqual(["algebra"]);
    expect(form.subjectId).toBe("subj-1");
    expect(form.difficulty).toBe("easy");
  });

  it("không skill → tags rỗng; subjectId rỗng → undefined", () => {
    const form = previewToFormValues(
      { key: "k", content: "Q", type: "SINGLE_CHOICE", answers: [] },
      "medium",
      ""
    );
    expect(form.tags).toEqual([]);
    expect(form.subjectId).toBeUndefined();
  });

  it("EASY/MEDIUM/HARD → easy/medium/hard", () => {
    expect(toQuizDifficulty("EASY")).toBe("easy");
    expect(toQuizDifficulty("MEDIUM")).toBe("medium");
    expect(toQuizDifficulty("HARD")).toBe("hard");
  });
});
