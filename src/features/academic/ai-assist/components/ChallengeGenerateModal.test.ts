import { describe, expect, it } from "vitest";
import type { ChallengeDraft } from "../api";
import {
  buildAiBatchChallengeItems,
  CHALLENGE_TYPE_OPTIONS,
  defaultCodeDraftSettings,
  validateCodeDraftSettings,
  type CodeDraftSettings,
} from "./ChallengeGenerateModal";

const codeDraft: ChallengeDraft = {
  type: "CODE",
  title: "HSF - Xây dựng hệ thống bán hàng",
  description: "Tạo solution nhiều project và đáp ứng đầy đủ yêu cầu nghiệp vụ.",
  grading_config: { mode: "TESTCASE", question: null, criteria: null, pass_ratio: 0.75 },
  test_cases: [
    { input: "seed", expected: "ok", hidden: false, weight: 1 },
    { input: "hidden", expected: "ok", hidden: true, weight: 2 },
  ],
};

describe("ChallengeGenerateModal — loại bài dễ hiểu", () => {
  it("phân biệt rõ project GitHub/tệp với Code Sandbox ngay trong option", () => {
    const project = CHALLENGE_TYPE_OPTIONS.find((option) => option.value === "CODE");
    const sandbox = CHALLENGE_TYPE_OPTIONS.find((option) => option.value === "CODING");

    expect(project?.label).toMatch(/GitHub.*ZIP.*AI chấm/i);
    expect(sandbox?.label).toMatch(/Sandbox.*test case/i);
  });

  it("CODE mặc định là project BOTH + .zip; CODING mặc định là sandbox", () => {
    expect(defaultCodeDraftSettings({ type: "CODE" })).toEqual({
      mode: "PROJECT",
      submissionMethod: "BOTH",
      fileExtension: ".zip",
    });
    expect(defaultCodeDraftSettings({ type: "CODING" }).mode).toBe("SANDBOX");
  });
});

describe("buildAiBatchChallengeItems", () => {
  it("project: set CODE+BOTH, ép AI grading, giữ đủ đề/criteria/file whitelist và BỎ test case", () => {
    const settings: Record<number, CodeDraftSettings> = {
      0: { mode: "PROJECT", submissionMethod: "BOTH", fileExtension: ".zip,.cs,.sln" },
    };
    const [item] = buildAiBatchChallengeItems([codeDraft], new Set([0]), {
      courseId: "course-hsf",
      lessonId: "lesson-hsf",
      codeSettings: settings,
    });

    expect(item.lessonId).toBe("lesson-hsf");
    expect(item.challenge).toMatchObject({
      title: codeDraft.title,
      description: codeDraft.description,
      type: "CODE",
      courseId: "course-hsf",
      submissionMethod: "BOTH",
    });
    expect(item.testCases).toBeNull();

    const grading = JSON.parse(String(item.challenge.gradingConfig));
    expect(grading).toMatchObject({
      mode: "AI",
      criteria: codeDraft.description,
      fileExtension: ".zip,.cs,.sln",
    });
    expect(grading.question).toContain(codeDraft.title);
    expect(grading.question).toContain(codeDraft.description);
    expect(grading.pass_ratio).toBeUndefined();
  });

  it("project chỉ GitHub: không để sót fileExtension từ config AI", () => {
    const draft: ChallengeDraft = {
      ...codeDraft,
      grading_config: { mode: "TESTCASE", fileExtension: ".zip" },
    };
    const [item] = buildAiBatchChallengeItems([draft], new Set([0]), {
      codeSettings: {
        0: { mode: "PROJECT", submissionMethod: "GITHUB", fileExtension: ".zip" },
      },
    });
    const grading = JSON.parse(String(item.challenge.gradingConfig));
    expect(grading.fileExtension).toBeUndefined();
  });

  it("sandbox: normalize CODE→CODING, giữ toàn bộ test case, không gửi submissionMethod", () => {
    const [item] = buildAiBatchChallengeItems([codeDraft], new Set([0]), {
      codeSettings: {
        0: { mode: "SANDBOX", submissionMethod: "BOTH", fileExtension: ".zip" },
      },
    });

    expect(item.challenge.type).toBe("CODING");
    expect(item.challenge).not.toHaveProperty("submissionMethod");
    expect(item.testCases).toHaveLength(2);
    expect(item.testCases?.[1]).toMatchObject({
      name: "Case 2",
      expectedOutput: "ok",
      hidden: true,
      weight: 2,
      orderNo: 1,
    });
  });

  it("CODING đổi sang project: normalize thành CODE để learner hiện GitHub/tệp", () => {
    const coding = { ...codeDraft, type: "CODING" };
    const [item] = buildAiBatchChallengeItems([coding], new Set([0]), {
      codeSettings: {
        0: { mode: "PROJECT", submissionMethod: "FILE", fileExtension: ".zip" },
      },
    });
    expect(item.challenge).toMatchObject({ type: "CODE", submissionMethod: "FILE" });
    expect(item.testCases).toBeNull();
  });

  it("chỉ dựng những draft mentor đã tick", () => {
    const essay: ChallengeDraft = { type: "ESSAY", title: "Essay", description: "Viết bài" };
    const items = buildAiBatchChallengeItems([codeDraft, essay], new Set([1]));
    expect(items).toHaveLength(1);
    expect(items[0].challenge.title).toBe("Essay");
  });
});

describe("validateCodeDraftSettings", () => {
  it("chặn project FILE/BOTH thiếu whitelist, nhưng GitHub và sandbox không bị chặn", () => {
    expect(
      validateCodeDraftSettings([codeDraft], new Set([0]), {
        0: { mode: "PROJECT", submissionMethod: "BOTH", fileExtension: "  " },
      })
    ).toContain("chưa khai đuôi file");

    expect(
      validateCodeDraftSettings([codeDraft], new Set([0]), {
        0: { mode: "PROJECT", submissionMethod: "GITHUB", fileExtension: "" },
      })
    ).toBeNull();
    expect(
      validateCodeDraftSettings([codeDraft], new Set([0]), {
        0: { mode: "SANDBOX", submissionMethod: "FILE", fileExtension: "" },
      })
    ).toBeNull();
  });

  it("chặn Sandbox không có test case vì sẽ không có gì để chấm", () => {
    const noCases: ChallengeDraft = {
      ...codeDraft,
      title: "Sandbox rỗng",
      test_cases: [],
    };
    expect(
      validateCodeDraftSettings([noCases], new Set([0]), {
        0: { mode: "SANDBOX", submissionMethod: "BOTH", fileExtension: ".zip" },
      })
    ).toContain("chưa có test case");

    expect(
      validateCodeDraftSettings([noCases], new Set([0]), {
        0: { mode: "PROJECT", submissionMethod: "GITHUB", fileExtension: "" },
      })
    ).toBeNull();
  });
});
