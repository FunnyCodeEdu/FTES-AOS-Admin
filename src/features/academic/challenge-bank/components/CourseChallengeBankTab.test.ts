import { describe, expect, it } from "vitest";
import {
  buildLessonNameMap,
  buildLessonOptions,
  filterBankRows,
  visibilityActionFor,
} from "./CourseChallengeBankTab";
import type { BankChallenge } from "../api/challengeBank.api";
import type { CourseTreeNode } from "../../types";

// Nợ quality-loop admin-course-challenge-bank 2.3 + 4.2 (phần unit): filter bảng kho,
// resolve tên lesson từ cây course, và ma trận enable/disable toggle visibility.

function bankRow(over: Partial<BankChallenge>): BankChallenge {
  return {
    id: "ch-1",
    title: "Thử thách",
    slug: "thu-thach",
    type: "MULTIPLE_CHOICE",
    status: "DRAFT",
    visibility: "COURSE_ONLY",
    courseId: "c-1",
    lessonId: null,
    startsAt: null,
    endsAt: null,
    updatedAt: null,
    ...over,
  };
}

const rows: BankChallenge[] = [
  bankRow({ id: "a", type: "MULTIPLE_CHOICE", visibility: "COURSE_ONLY" }),
  bankRow({ id: "b", type: "CODE", visibility: "WORKSPACE_PUBLIC" }),
  bankRow({ id: "c", type: "CODE", visibility: "COURSE_ONLY" }),
  bankRow({ id: "d", type: "SQL", visibility: "WORKSPACE_PUBLIC" }),
];

describe("filterBankRows — filter client-side type + visibility", () => {
  it("không filter → giữ nguyên toàn bộ", () => {
    expect(filterBankRows(rows).map((r) => r.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("filter theo type", () => {
    expect(filterBankRows(rows, "CODE").map((r) => r.id)).toEqual(["b", "c"]);
  });

  it("filter theo visibility", () => {
    expect(filterBankRows(rows, undefined, "WORKSPACE_PUBLIC").map((r) => r.id)).toEqual([
      "b",
      "d",
    ]);
  });

  it("filter kết hợp type × visibility (AND)", () => {
    expect(filterBankRows(rows, "CODE", "WORKSPACE_PUBLIC").map((r) => r.id)).toEqual(["b"]);
  });

  it("không match → mảng rỗng (bảng hiện empty-state)", () => {
    expect(filterBankRows(rows, "ESSAY")).toEqual([]);
  });
});

const tree: CourseTreeNode[] = [
  {
    id: "sec-1",
    key: "sec-1",
    title: "Phần 1",
    type: "section",
    children: [
      { id: "l1", key: "l1", title: "Bài 1", type: "lesson" },
      { id: "l2", key: "l2", title: "Bài 2", type: "lesson" },
      { id: "as-1", key: "as-1", title: "Bài tập lớn", type: "assignment" },
    ],
  },
  {
    id: "sec-2",
    key: "sec-2",
    title: "Phần 2",
    type: "section",
    children: [{ key: "draft", title: "Bài nháp chưa lưu", type: "lesson" }], // chưa có id
  },
];

describe("buildLessonNameMap — resolve cột 'Lesson gắn' từ cây course", () => {
  it("map lessonId → 'Section / Lesson'", () => {
    const map = buildLessonNameMap(tree);
    expect(map.get("l1")).toBe("Phần 1 / Bài 1");
    expect(map.get("l2")).toBe("Phần 1 / Bài 2");
  });

  it("assignment + lesson chưa có id không vào map (id lạ → FE hiện '(ngoài khoá này)')", () => {
    const map = buildLessonNameMap(tree);
    expect(map.has("as-1")).toBe(false);
    expect(map.size).toBe(2);
    expect(map.get("lesson-cua-khoa-khac")).toBeUndefined();
  });
});

describe("buildLessonOptions — attach picker CHỈ lesson cùng course", () => {
  it("nhóm theo section, chỉ lesson có id", () => {
    expect(buildLessonOptions(tree)).toEqual([
      {
        label: "Phần 1",
        options: [
          { label: "Bài 1", value: "l1" },
          { label: "Bài 2", value: "l2" },
        ],
      },
    ]);
  });

  it("cây rỗng → không nhóm nào (picker hiện 'Khoá chưa có bài học')", () => {
    expect(buildLessonOptions([])).toEqual([]);
  });
});

describe("visibilityActionFor — ma trận status × visibility × permission", () => {
  it("COURSE_ONLY + PUBLISHED + có quyền → Public ENABLED", () => {
    expect(visibilityActionFor(bankRow({ status: "PUBLISHED" }), true)).toEqual({
      action: "publish",
      enabled: true,
      reason: "",
    });
  });

  it("COURSE_ONLY + RUNNING + có quyền → Public ENABLED", () => {
    expect(visibilityActionFor(bankRow({ status: "RUNNING" }), true).enabled).toBe(true);
  });

  it("COURSE_ONLY + DRAFT/CLOSED/ARCHIVED → Public DISABLED, lý do trạng thái", () => {
    for (const status of ["DRAFT", "CLOSED", "ARCHIVED"]) {
      const state = visibilityActionFor(bankRow({ status }), true);
      expect(state.action).toBe("publish");
      expect(state.enabled).toBe(false);
      expect(state.reason).toContain("PUBLISHED/RUNNING");
    }
  });

  it("COURSE_ONLY + PUBLISHED nhưng THIẾU quyền → DISABLED, lý do quyền (ưu tiên hơn trạng thái)", () => {
    const state = visibilityActionFor(bankRow({ status: "PUBLISHED" }), false);
    expect(state.enabled).toBe(false);
    expect(state.reason).toContain("challenge.manage");

    const draftNoPerm = visibilityActionFor(bankRow({ status: "DRAFT" }), false);
    expect(draftNoPerm.reason).toContain("challenge.manage");
  });

  it("WORKSPACE_PUBLIC + có quyền → Thu về kho ENABLED (mọi status)", () => {
    for (const status of ["DRAFT", "PUBLISHED", "RUNNING", "CLOSED"]) {
      expect(
        visibilityActionFor(bankRow({ status, visibility: "WORKSPACE_PUBLIC" }), true)
      ).toEqual({ action: "pullback", enabled: true, reason: "" });
    }
  });

  it("WORKSPACE_PUBLIC + thiếu quyền → Thu về kho DISABLED, lý do quyền", () => {
    const state = visibilityActionFor(bankRow({ visibility: "WORKSPACE_PUBLIC" }), false);
    expect(state).toMatchObject({ action: "pullback", enabled: false });
    expect(state.reason).toContain("challenge.manage");
  });
});
