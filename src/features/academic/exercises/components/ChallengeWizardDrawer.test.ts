import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import { ApiError } from "../../../../shared/api/client";
import {
  buildCreateChallengePayload,
  buildMcqQuestionItems,
  buildRubricItems,
  buildTestCaseItems,
  isLessonLinkConflict,
  isPublishBlocked,
  slugify,
  type MetaForm,
} from "./ChallengeWizardDrawer";

// Task 3.2 — admin-lesson-exercise-authoring: wizard state + payload theo type challenge.

describe("slugify", () => {
  it("bỏ dấu tiếng Việt, đ → d, space/ký tự lạ → gạch ngang", () => {
    expect(slugify("Thử thách Thuật Toán tuần 1!")).toBe("thu-thach-thuat-toan-tuan-1");
    expect(slugify("Đường đi ngắn nhất")).toBe("duong-di-ngan-nhat");
  });

  it("cắt 60 ký tự, không để gạch ngang đầu/cuối", () => {
    expect(slugify("--Hello--")).toBe("hello");
    expect(slugify("a".repeat(80))).toHaveLength(60);
  });
});

function meta(over: Partial<MetaForm>): MetaForm {
  return {
    title: "Thử thách tuần 1",
    slug: "thu-thach-tuan-1",
    type: "MULTIPLE_CHOICE",
    range: [dayjs("2026-07-01T00:00:00Z"), dayjs("2026-08-01T00:00:00Z")],
    maxSubmissions: 10,
    ...over,
  };
}

describe("buildCreateChallengePayload (bước 1 theo mode)", () => {
  it("mode luôn INDIVIDUAL, range → ISO, description rỗng → undefined", () => {
    const payload = buildCreateChallengePayload(meta({ description: "" }));
    expect(payload.mode).toBe("INDIVIDUAL");
    expect(payload.startsAt).toBe("2026-07-01T00:00:00.000Z");
    expect(payload.endsAt).toBe("2026-08-01T00:00:00.000Z");
    expect(payload.description).toBeUndefined();
    expect(payload.maxSubmissions).toBe(10);
  });

  it("slug rỗng → tự sinh từ title", () => {
    expect(buildCreateChallengePayload(meta({ slug: "" })).slug).toBe("thu-thach-tuan-1");
  });

  it("mode Kho truyền courseId → đính courseId; mode lesson KHÔNG có field (giữ hành vi cũ)", () => {
    expect(buildCreateChallengePayload(meta({}), "course-9").courseId).toBe("course-9");
    expect("courseId" in buildCreateChallengePayload(meta({}))).toBe(false);
  });
});

describe("buildMcqQuestionItems (type MULTIPLE_CHOICE)", () => {
  it("key A.. theo vị trí, correctKeys từ ô tick, orderNo theo index, points default 1", () => {
    const built = buildMcqQuestionItems([
      {
        question: "Q1",
        options: [
          { text: "a", correct: true },
          { text: "b", correct: false },
        ],
      },
      {
        question: "Q2",
        options: [
          { text: "x", correct: true },
          { text: "y", correct: true },
        ],
        points: 5,
      },
    ]);
    expect(built.error).toBeUndefined();
    expect(built.questions).toEqual([
      {
        question: "Q1",
        options: [
          { key: "A", text: "a" },
          { key: "B", text: "b" },
        ],
        correctKeys: ["A"],
        points: 1,
        orderNo: 0,
      },
      {
        question: "Q2",
        options: [
          { key: "A", text: "x" },
          { key: "B", text: "y" },
        ],
        correctKeys: ["A", "B"],
        points: 5,
        orderNo: 1,
      },
    ]);
  });

  it("một câu 0 đáp án đúng → error, KHÔNG trả questions (chặn trước request)", () => {
    const built = buildMcqQuestionItems([
      {
        question: "Q1",
        options: [
          { text: "a", correct: true },
          { text: "b", correct: false },
        ],
      },
      {
        question: "Q2 hỏng",
        options: [
          { text: "x", correct: false },
          { text: "y", correct: false },
        ],
      },
    ]);
    expect(built.questions).toBeUndefined();
    expect(built.error).toBe("Câu nhiều đáp án cần ít nhất 1 đáp án đúng");
  });
});

describe("buildTestCaseItems (type CODE)", () => {
  it("default weight 1 / limit 2000ms / 256MB, orderNo theo index", () => {
    expect(
      buildTestCaseItems([
        { name: "T1", input: "1", expectedOutput: "1", hidden: false },
        { name: "T2", input: "2", expectedOutput: "4", weight: 3, hidden: true },
      ])
    ).toEqual([
      {
        name: "T1",
        input: "1",
        expectedOutput: "1",
        weight: 1,
        hidden: false,
        timeLimitMs: 2000,
        memoryLimitMb: 256,
        orderNo: 0,
      },
      {
        name: "T2",
        input: "2",
        expectedOutput: "4",
        weight: 3,
        hidden: true,
        timeLimitMs: 2000,
        memoryLimitMb: 256,
        orderNo: 1,
      },
    ]);
  });
});

describe("buildRubricItems (CODE/ESSAY)", () => {
  it("default description '' / maxScore 10, orderNo theo index", () => {
    expect(
      buildRubricItems([
        { criterion: "Logic" },
        { criterion: "Trình bày", description: "rõ ràng", maxScore: 4 },
      ])
    ).toEqual([
      { criterion: "Logic", description: "", maxScore: 10, orderNo: 0 },
      { criterion: "Trình bày", description: "rõ ràng", maxScore: 4, orderNo: 1 },
    ]);
  });
});

describe("wizard state bước 3", () => {
  it("mode lesson: publish bị chặn tới khi gắn xong; mode Kho publish được ngay", () => {
    expect(isPublishBlocked(false, false)).toBe(true);
    expect(isPublishBlocked(false, true)).toBe(false);
    expect(isPublishBlocked(true, false)).toBe(false);
    expect(isPublishBlocked(true, true)).toBe(false);
  });

  it("nhận diện lỗi lesson-đã-có-challenge-active (errorCode BE hoặc HTTP 409)", () => {
    expect(
      isLessonLinkConflict(new ApiError(400, "x", false, "CHALLENGE_LESSON_ALREADY_ATTACHED"))
    ).toBe(true);
    expect(isLessonLinkConflict(new ApiError(409, "conflict"))).toBe(true);
    expect(isLessonLinkConflict(new ApiError(400, "khác", false, "OTHER"))).toBe(false);
    expect(isLessonLinkConflict(new Error("mạng"))).toBe(false);
  });
});
