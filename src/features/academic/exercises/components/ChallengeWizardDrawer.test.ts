import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import { ApiError } from "../../../../shared/api/client";
import {
  acceptsSqlExtension,
  allowsFile,
  buildAssignmentGradingConfig,
  buildCreateChallengePayload,
  buildMcqQuestionItems,
  buildRubricItems,
  buildTestCaseItems,
  isCodeSubmission,
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
    free: false,
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

  it("challenge-free-flag: free của form → payload.free (default false, bật true khi tick)", () => {
    expect(buildCreateChallengePayload(meta({})).free).toBe(false);
    expect(buildCreateChallengePayload(meta({ free: true })).free).toBe(true);
  });

  it("§④ MCQ / CODE test-case-inline KHÔNG có submissionMethod/gradingConfig", () => {
    const mcq = buildCreateChallengePayload(meta({ type: "MULTIPLE_CHOICE" }));
    expect("submissionMethod" in mcq).toBe(false);
    expect(mcq.gradingConfig).toBeUndefined();
    const codeInline = buildCreateChallengePayload(meta({ type: "CODE", codeInputStyle: "TESTCASE" }));
    expect("submissionMethod" in codeInline).toBe(false);
    expect(codeInline.gradingConfig).toBeUndefined();
  });

  it("§④ CODE bài NỘP → đính submissionMethod + gradingConfig (rubric JSON)", () => {
    const payload = buildCreateChallengePayload(
      meta({
        type: "CODE",
        codeInputStyle: "SUBMISSION",
        submissionMethod: "BOTH",
        fileExtension: ".zip,.sql",
        question: "Tối ưu truy vấn",
        expectedOutput: "< 100ms",
        criteria: "Đúng + nhanh",
        checkLogic: true,
        checkPerform: false,
        checkEdgeCase: true,
      })
    );
    expect(payload.submissionMethod).toBe("BOTH");
    expect(JSON.parse(payload.gradingConfig!)).toEqual({
      question: "Tối ưu truy vấn",
      expectedOutput: "< 100ms",
      criteria: "Đúng + nhanh",
      fileExtension: ".zip,.sql",
      checkLogic: true,
      checkPerform: false,
      checkEdgeCase: true,
    });
  });

  it("§2C CODE bài NỘP whitelist .sql → gói seedSql (dataset) vào gradingConfig", () => {
    const payload = buildCreateChallengePayload(
      meta({
        type: "CODE",
        codeInputStyle: "SUBMISSION",
        submissionMethod: "FILE",
        fileExtension: ".sql",
        question: "Viết truy vấn tổng doanh thu",
        seedSql: "  CREATE TABLE orders(id int);  ",
        checkLogic: true,
        checkPerform: true,
        checkEdgeCase: true,
      })
    );
    // seedSql trim + gói trong gradingConfig (không phải flat field ở create).
    expect(JSON.parse(payload.gradingConfig!).seedSql).toBe("CREATE TABLE orders(id int);");
    expect("seedSql" in payload).toBe(false);
  });
});

describe("§④ submission helpers (folded assignment)", () => {
  it("isCodeSubmission: chỉ CODE + codeInputStyle=SUBMISSION", () => {
    expect(isCodeSubmission({ type: "CODE", codeInputStyle: "SUBMISSION" })).toBe(true);
    expect(isCodeSubmission({ type: "CODE", codeInputStyle: "TESTCASE" })).toBe(false);
    expect(isCodeSubmission({ type: "CODE", codeInputStyle: undefined })).toBe(false);
    expect(isCodeSubmission({ type: "ESSAY", codeInputStyle: "SUBMISSION" })).toBe(false);
  });

  it("allowsFile: FILE/BOTH cho nộp file, GITHUB thì không", () => {
    expect(allowsFile("FILE")).toBe(true);
    expect(allowsFile("BOTH")).toBe(true);
    expect(allowsFile("GITHUB")).toBe(false);
    expect(allowsFile(undefined)).toBe(false);
  });

  it("buildAssignmentGradingConfig: GITHUB bỏ fileExtension, trim + check* default true", () => {
    const cfg = JSON.parse(
      buildAssignmentGradingConfig(
        meta({
          type: "CODE",
          codeInputStyle: "SUBMISSION",
          submissionMethod: "GITHUB",
          fileExtension: ".zip",
          question: "  Đề bài  ",
          checkLogic: undefined,
          checkPerform: undefined,
          checkEdgeCase: undefined,
        })
      )
    );
    expect(cfg.fileExtension).toBeUndefined(); // GITHUB → không whitelist đuôi file
    expect(cfg.question).toBe("Đề bài"); // trim
    expect(cfg).toMatchObject({ checkLogic: true, checkPerform: true, checkEdgeCase: true });
  });

  it("§2C buildAssignmentGradingConfig: whitelist .sql → seedSql (trim); non-sql → bỏ seedSql", () => {
    const withSql = JSON.parse(
      buildAssignmentGradingConfig(
        meta({
          type: "CODE",
          codeInputStyle: "SUBMISSION",
          submissionMethod: "BOTH",
          fileExtension: ".zip,.SQL", // hoa vẫn tính là sql
          seedSql: "  SELECT 1;  ",
        })
      )
    );
    expect(withSql.seedSql).toBe("SELECT 1;");

    const noSql = JSON.parse(
      buildAssignmentGradingConfig(
        meta({
          type: "CODE",
          codeInputStyle: "SUBMISSION",
          submissionMethod: "FILE",
          fileExtension: ".zip,.py",
          seedSql: "SELECT 1;", // có value nhưng whitelist không có .sql → bỏ
        })
      )
    );
    expect(noSql.seedSql).toBeUndefined();
  });

  it("§2C buildAssignmentGradingConfig: GITHUB (không nộp file) → bỏ seedSql dù form còn giá trị", () => {
    const cfg = JSON.parse(
      buildAssignmentGradingConfig(
        meta({
          type: "CODE",
          codeInputStyle: "SUBMISSION",
          submissionMethod: "GITHUB",
          fileExtension: ".sql",
          seedSql: "SELECT 1;",
        })
      )
    );
    expect(cfg.seedSql).toBeUndefined();
  });
});

describe("§2C acceptsSqlExtension (whitelist đuôi file)", () => {
  it("nhận diện .sql bất kể dấu chấm / hoa-thường / khoảng trắng, đa đuôi", () => {
    expect(acceptsSqlExtension(".zip,.sql,.py")).toBe(true);
    expect(acceptsSqlExtension(" .SQL ")).toBe(true);
    expect(acceptsSqlExtension("sql")).toBe(true);
    expect(acceptsSqlExtension(".zip,.py")).toBe(false);
    expect(acceptsSqlExtension("")).toBe(false);
    expect(acceptsSqlExtension(undefined)).toBe(false);
    expect(acceptsSqlExtension(null)).toBe(false);
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
