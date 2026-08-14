import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import { ApiError } from "../../../../shared/api/client";
import {
  acceptsSqlExtension,
  AI_FEEDBACK_LIMIT_DEFAULT,
  AI_FEEDBACK_LIMIT_MAX,
  AI_FEEDBACK_LIMIT_MIN,
  allowsFile,
  buildAssignmentGradingConfig,
  buildCreateChallengePayload,
  buildMcqQuestionItems,
  buildRubricItems,
  buildStarterCodeMap,
  clampAiFeedbackLimit,
  isCodeSubmission,
  isCodeTestCase,
  isLessonLinkConflict,
  isPublishBlocked,
  isSubjectListReadable,
  slugify,
  starterCodeMapToRows,
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

  // challenge-testcase-editor §4.2 — thời gian đóng TUỲ CHỌN (mở vô hạn).
  it("§4.2 vế đóng bỏ trống → endsAt = null (không dereference range[1]), startsAt vẫn gửi", () => {
    const payload = buildCreateChallengePayload(
      meta({ range: [dayjs("2026-07-01T00:00:00Z"), null] })
    );
    expect(payload.endsAt).toBeNull();
    expect(payload.startsAt).toBe("2026-07-01T00:00:00.000Z");
  });

  it("§4.2 range vắng hoàn toàn → không nổ, endsAt = null", () => {
    const payload = buildCreateChallengePayload(
      meta({ range: undefined as unknown as MetaForm["range"] })
    );
    expect(payload.endsAt).toBeNull();
    expect(typeof payload.startsAt).toBe("string");
  });

  it("mode Kho truyền courseId → đính courseId; mode lesson KHÔNG có field (giữ hành vi cũ)", () => {
    expect(buildCreateChallengePayload(meta({}), "course-9").courseId).toBe("course-9");
    expect("courseId" in buildCreateChallengePayload(meta({}))).toBe(false);
  });

  // ── Bug "đề môn khác hiện ở tab Luyện tập": wizard không gửi subjectId ⇒ subject_id = NULL ──
  it("gửi subjectId người soạn chọn (thiếu field này là gốc của bug 'môn nào cũng chưa có đề')", () => {
    expect(buildCreateChallengePayload(meta({ subjectId: "subject-jpd113" })).subjectId).toBe(
      "subject-jpd113"
    );
  });

  it("chưa chọn môn → KHÔNG đính subjectId (BE parse UUID, chuỗi rỗng sẽ là 400)", () => {
    expect("subjectId" in buildCreateChallengePayload(meta({}))).toBe(false);
    expect("subjectId" in buildCreateChallengePayload(meta({ subjectId: "" }))).toBe(false);
  });

  /**
   * §B — hàng rào chặn tag PE mặc định của BE. `ChallengeCreateTags.apply` coi tags==null là "tự
   * suy" và gắn ['pe', mã môn]; tag `pe` lật DRAFT sang PUBLISHED/PENDING_APPROVAL
   * (`applyPeAutoPublish`). Nếu payload gửi subjectId mà bỏ trống tags, mọi bài tập soạn qua wizard
   * sẽ tự xuất bản ngay ở bước 1 — trước khi tác giả soạn câu hỏi/test case ở bước 2.
   */
  it("LUÔN gửi tags = [] (mảng rỗng tường minh) — kể cả khi có subjectId", () => {
    expect(buildCreateChallengePayload(meta({ subjectId: "subject-jpd113" })).tags).toEqual([]);
    expect(buildCreateChallengePayload(meta({})).tags).toEqual([]);
  });

  it("KHÔNG tự thêm tag mã môn ở FE — BE suy từ subjectId (tránh hai nguồn sự thật)", () => {
    expect(buildCreateChallengePayload(meta({ subjectId: "subject-jpd113" })).tags).toHaveLength(0);
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

  it("§3 CODE test-case (thuật toán) có sườn → đính gradingConfig mang starterCode, KHÔNG submissionMethod", () => {
    const payload = buildCreateChallengePayload(
      meta({
        type: "CODE",
        codeInputStyle: "TESTCASE",
        starterCode: [
          { language: "python", code: "def solve():\n    pass" },
          { language: "java", code: "class Main {}" },
        ],
      })
    );
    // Bài test-case KHÔNG phải bài nộp → không có submissionMethod.
    expect("submissionMethod" in payload).toBe(false);
    const cfg = JSON.parse(payload.gradingConfig!);
    expect(cfg.starterCode).toEqual({
      python: "def solve():\n    pass",
      java: "class Main {}",
    });
    // starterCode là flat field ở create? Không — gói trong gradingConfig (như seedSql).
    expect("starterCode" in payload).toBe(false);
  });

  it("§3 CODE test-case KHÔNG có sườn (rows rỗng/thiếu) → gradingConfig vẫn undefined (giữ hành vi cũ)", () => {
    expect(
      buildCreateChallengePayload(
        meta({ type: "CODE", codeInputStyle: "TESTCASE", starterCode: [] })
      ).gradingConfig
    ).toBeUndefined();
    expect(
      buildCreateChallengePayload(
        meta({ type: "CODE", codeInputStyle: "TESTCASE", starterCode: [{ language: "python", code: "   " }] })
      ).gradingConfig
    ).toBeUndefined();
  });
});

// challenge-testcase-sample-ui §3 — số lần AI NHẬN XÉT (mentor đặt, BE kẹp 1..5).
describe("§3 clampAiFeedbackLimit", () => {
  it("giữ nguyên giá trị trong biên 1..5", () => {
    expect(clampAiFeedbackLimit(1)).toBe(1);
    expect(clampAiFeedbackLimit(3)).toBe(3);
    expect(clampAiFeedbackLimit(AI_FEEDBACK_LIMIT_MAX)).toBe(5);
  });

  it("vượt trần → kẹp về 5; dưới sàn (0/âm) → kẹp về 1 (0 = tắt AI, BE không nhận)", () => {
    expect(clampAiFeedbackLimit(6)).toBe(AI_FEEDBACK_LIMIT_MAX);
    expect(clampAiFeedbackLimit(999)).toBe(5);
    expect(clampAiFeedbackLimit(0)).toBe(AI_FEEDBACK_LIMIT_MIN);
    expect(clampAiFeedbackLimit(-4)).toBe(1);
  });

  it("số lẻ → cắt phần thập phân; trống / NaN / không phải số → mặc định 1", () => {
    expect(clampAiFeedbackLimit(2.9)).toBe(2);
    expect(clampAiFeedbackLimit(null)).toBe(AI_FEEDBACK_LIMIT_DEFAULT);
    expect(clampAiFeedbackLimit(undefined)).toBe(1);
    expect(clampAiFeedbackLimit(Number.NaN)).toBe(1);
    expect(clampAiFeedbackLimit("3" as unknown as number)).toBe(1);
  });
});

describe("§3 isCodeTestCase + aiFeedbackLimit trong payload TẠO", () => {
  it("isCodeTestCase: chỉ CODE + codeInputStyle=TESTCASE", () => {
    expect(isCodeTestCase({ type: "CODE", codeInputStyle: "TESTCASE" })).toBe(true);
    expect(isCodeTestCase({ type: "CODE", codeInputStyle: "SUBMISSION" })).toBe(false);
    expect(isCodeTestCase({ type: "CODE", codeInputStyle: undefined })).toBe(false);
    expect(isCodeTestCase({ type: "ESSAY", codeInputStyle: "TESTCASE" })).toBe(false);
  });

  it("CODE test-case: gửi aiFeedbackLimit của form (flat field, không nằm trong gradingConfig)", () => {
    const payload = buildCreateChallengePayload(
      meta({ type: "CODE", codeInputStyle: "TESTCASE", aiFeedbackLimit: 3 })
    );
    expect(payload.aiFeedbackLimit).toBe(3);
    expect(payload.gradingConfig).toBeUndefined();
  });

  it("CODE test-case bỏ trống ô → mặc định 1; nhập quá 5 → kẹp 5; nhập 0 → kẹp 1", () => {
    expect(
      buildCreateChallengePayload(meta({ type: "CODE", codeInputStyle: "TESTCASE" }))
        .aiFeedbackLimit
    ).toBe(AI_FEEDBACK_LIMIT_DEFAULT);
    expect(
      buildCreateChallengePayload(
        meta({ type: "CODE", codeInputStyle: "TESTCASE", aiFeedbackLimit: 9 })
      ).aiFeedbackLimit
    ).toBe(5);
    expect(
      buildCreateChallengePayload(
        meta({ type: "CODE", codeInputStyle: "TESTCASE", aiFeedbackLimit: 0 })
      ).aiFeedbackLimit
    ).toBe(1);
  });

  it("loại KHÁC (MCQ / ESSAY / CODE bài NỘP) → KHÔNG đính aiFeedbackLimit (không control giả)", () => {
    expect(
      "aiFeedbackLimit" in
        buildCreateChallengePayload(meta({ type: "MULTIPLE_CHOICE", aiFeedbackLimit: 4 }))
    ).toBe(false);
    expect(
      "aiFeedbackLimit" in buildCreateChallengePayload(meta({ type: "ESSAY", aiFeedbackLimit: 4 }))
    ).toBe(false);
    expect(
      "aiFeedbackLimit" in
        buildCreateChallengePayload(
          meta({
            type: "CODE",
            codeInputStyle: "SUBMISSION",
            submissionMethod: "GITHUB",
            aiFeedbackLimit: 4,
          })
        )
    ).toBe(false);
  });

  it("aiFeedbackLimit KHÔNG lọt vào gradingConfig của bài NỘP (BE tự merge từ flat field)", () => {
    const cfg = JSON.parse(
      buildAssignmentGradingConfig(
        meta({
          type: "CODE",
          codeInputStyle: "TESTCASE",
          aiFeedbackLimit: 4,
          starterCode: [{ language: "python", code: "pass" }],
        })
      )
    );
    expect("aiFeedbackLimit" in cfg).toBe(false);
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

describe("§3 starter code (sườn per-ngôn-ngữ)", () => {
  it("buildStarterCodeMap: rows → map, trim+lowercase ngôn ngữ, GIỮ NGUYÊN thân code (thụt dòng)", () => {
    expect(
      buildStarterCodeMap([
        { language: "  Python ", code: "def solve():\n    pass\n" },
        { language: "CPP", code: "int main(){}" },
      ])
    ).toEqual({
      python: "def solve():\n    pass\n",
      cpp: "int main(){}",
    });
  });

  it("buildStarterCodeMap: bỏ hàng thiếu ngôn ngữ hoặc code rỗng; ngôn ngữ trùng → hàng sau ghi đè", () => {
    expect(
      buildStarterCodeMap([
        { language: "python", code: "   " }, // code rỗng → bỏ
        { code: "no-lang" }, // thiếu ngôn ngữ → bỏ
        { language: "java", code: "v1" },
        { language: "java", code: "v2" }, // trùng → ghi đè
      ])
    ).toEqual({ java: "v2" });
  });

  it("buildStarterCodeMap: không có sườn hợp lệ / undefined → undefined (để JSON.stringify loại key)", () => {
    expect(buildStarterCodeMap(undefined)).toBeUndefined();
    expect(buildStarterCodeMap([])).toBeUndefined();
    expect(buildStarterCodeMap([{ language: "", code: "x" }])).toBeUndefined();
  });

  it("starterCodeMapToRows: map → rows; rỗng/undefined → mảng rỗng", () => {
    expect(starterCodeMapToRows({ python: "p", java: "j" })).toEqual([
      { language: "python", code: "p" },
      { language: "java", code: "j" },
    ]);
    expect(starterCodeMapToRows(undefined)).toEqual([]);
    expect(starterCodeMapToRows({})).toEqual([]);
  });

  it("buildAssignmentGradingConfig: đính starterCode khi có sườn; map rỗng → bỏ hẳn key", () => {
    const withStarter = JSON.parse(
      buildAssignmentGradingConfig(
        meta({
          type: "CODE",
          codeInputStyle: "TESTCASE",
          starterCode: [{ language: "python", code: "print(1)" }],
        })
      )
    );
    expect(withStarter.starterCode).toEqual({ python: "print(1)" });

    const noStarter = JSON.parse(
      buildAssignmentGradingConfig(meta({ type: "CODE", codeInputStyle: "TESTCASE" }))
    );
    expect("starterCode" in noStarter).toBe(false);
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

// buildTestCaseItems đã dời sang `TestCaseEditor.tsx` (challenge-testcase-editor §1.2) — test nằm
// cạnh component mới ở `TestCaseEditor.test.ts`.

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

/**
 * Ô "Môn học" bắt buộc hay không phụ thuộc việc ĐỌC ĐƯỢC danh mục môn: wizard còn mở cho chủ khoá,
 * mà chủ khoá không chắc có `admin.subject.read`. Bắt buộc mù trong tình huống đó = dropdown rỗng
 * và giảng viên không tạo được bài tập nào nữa.
 */
describe("isSubjectListReadable (ràng buộc 'chọn môn' phải nhường quyền đọc)", () => {
  it("đọc được danh mục (có môn) → BẮT BUỘC chọn môn", () => {
    expect(isSubjectListReadable({ isLoading: false, isError: false, count: 12 })).toBe(true);
  });

  it("đang tải → vẫn giữ ràng buộc (không nhấp nháy 'không bắt buộc' rồi đổi ý)", () => {
    expect(isSubjectListReadable({ isLoading: true, isError: false, count: 0 })).toBe(true);
  });

  it("lỗi đọc (403 thiếu quyền / mạng) → KHÔNG bắt buộc, để không chặn đứng người soạn", () => {
    expect(isSubjectListReadable({ isLoading: false, isError: true, count: 0 })).toBe(false);
  });

  it("danh mục rỗng → KHÔNG bắt buộc (không có gì để chọn thì đòi chọn là bẫy)", () => {
    expect(isSubjectListReadable({ isLoading: false, isError: false, count: 0 })).toBe(false);
  });
});
