import { describe, expect, it } from "vitest";
import { buildCreateAssignmentBody, type AssignmentForm } from "./AssignmentFormModal";

// Task 2.4 — admin-lesson-exercise-authoring: form → CreateAssignmentRequest đúng hình dạng BE.

function form(over: Partial<AssignmentForm>): AssignmentForm {
  return {
    title: "Bài tập DSA",
    question: "Cài đặt stack",
    free: false,
    checkLogic: true,
    checkPerform: false,
    checkEdgeCase: false,
    ...over,
  };
}

describe("buildCreateAssignmentBody", () => {
  it("map đủ field + sortOrder từ caller", () => {
    expect(
      buildCreateAssignmentBody(
        form({
          criteria: "đúng logic",
          expectedOutput: "LIFO",
          fileExtension: ".py",
          maxSubmissions: 3,
          free: true,
          checkPerform: true,
          checkEdgeCase: true,
          testCases: '[{"input":"1","output":"1"}]',
        }),
        4
      )
    ).toEqual({
      title: "Bài tập DSA",
      question: "Cài đặt stack",
      criteria: "đúng logic",
      expectedOutput: "LIFO",
      fileExtension: ".py",
      maxSubmissions: 3,
      free: true,
      checkLogic: true,
      checkPerform: true,
      checkEdgeCase: true,
      testCases: '[{"input":"1","output":"1"}]',
      sortOrder: 4,
    });
  });

  it("field text rỗng → undefined (BE bỏ qua, không lưu chuỗi rỗng)", () => {
    const body = buildCreateAssignmentBody(
      form({ criteria: "", expectedOutput: "", fileExtension: "", testCases: "" }),
      0
    );
    expect(body.criteria).toBeUndefined();
    expect(body.expectedOutput).toBeUndefined();
    expect(body.fileExtension).toBeUndefined();
    expect(body.testCases).toBeUndefined();
  });

  it("maxSubmissions không nhập → undefined; 0 giữ nguyên 0", () => {
    expect(buildCreateAssignmentBody(form({}), 0).maxSubmissions).toBeUndefined();
    expect(buildCreateAssignmentBody(form({ maxSubmissions: 0 }), 0).maxSubmissions).toBe(0);
  });

  it("cờ AI chấm (logic/perform/edge) pass-through boolean, không rơi mất", () => {
    const body = buildCreateAssignmentBody(
      form({ checkLogic: false, checkPerform: true, checkEdgeCase: false }),
      0
    );
    expect(body.checkLogic).toBe(false);
    expect(body.checkPerform).toBe(true);
    expect(body.checkEdgeCase).toBe(false);
  });
});
