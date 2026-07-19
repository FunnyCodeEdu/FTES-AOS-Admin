import { describe, expect, it } from "vitest";
import {
  isPackageAreaReadOnly,
  lessonOptionsFromTree,
  packageToFormValues,
  preservedScopeHints,
  sectionOptionsFromTree,
} from "./PricingTab";
import type { CoursePackage, CourseTreeNode } from "../../types";

// Task 4.2 — admin-course-package-editor: options entitlement dựng từ course.tree + khoá LEGACY chỉ đọc.

const tree: CourseTreeNode[] = [
  {
    id: "sec-1",
    key: "sec-1",
    title: "Phần 1",
    type: "section",
    children: [
      { id: "l1", key: "l1", title: "Bài 1", type: "lesson" },
      { key: "a1", title: "Bài tập", type: "assignment" },
    ],
  },
  {
    id: "sec-2",
    key: "sec-2",
    title: "Phần 2",
    type: "section",
    children: [{ id: "l2", key: "l2", title: "Bài 2", type: "lesson" }],
  },
];

describe("options từ course.tree", () => {
  it("sectionOptionsFromTree lấy đúng section có id", () => {
    expect(sectionOptionsFromTree(tree)).toEqual([
      { value: "sec-1", label: "Phần 1" },
      { value: "sec-2", label: "Phần 2" },
    ]);
  });

  it("lessonOptionsFromTree gom bài của mọi phần và bỏ node assignment (FE-only)", () => {
    expect(lessonOptionsFromTree(tree)).toEqual([
      { value: "l1", label: "Phần 1 / Bài 1" },
      { value: "l2", label: "Phần 2 / Bài 2" },
    ]);
  });
});

describe("isPackageAreaReadOnly", () => {
  it("khoá LEGACY luôn chỉ đọc dù có quyền", () => {
    expect(isPackageAreaReadOnly("LEGACY", false)).toBe(true);
  });

  it("thiếu quyền (readOnly) thì khoá PACKAGE cũng chỉ đọc", () => {
    expect(isPackageAreaReadOnly("PACKAGE", true)).toBe(true);
  });

  it("khoá PACKAGE + có quyền mới được ghi", () => {
    expect(isPackageAreaReadOnly("PACKAGE", false)).toBe(false);
  });
});

describe("preservedScopeHints", () => {
  const options = lessonOptionsFromTree(tree);

  it("dòng PART dạng ladder được nêu rõ là KHÔNG phải trọn phần", () => {
    const hints = preservedScopeHints(
      { type: "PART", sectionId: "sec-1", raw: { type: "PART", sectionId: "sec-1", selectedLessonIds: ["l1"] } },
      options
    );
    expect(hints[0]).toContain("KHÔNG phải trọn phần");
    expect(hints[0]).toContain("Phần 1 / Bài 1");
  });

  it("dòng PART trọn phần thật thì không có cảnh báo nào", () => {
    expect(preservedScopeHints({ type: "PART", sectionId: "sec-1" }, options)).toEqual([]);
  });

  it("nêu bài lẻ lessonId và quyền bài tập giữ nguyên", () => {
    const hints = preservedScopeHints(
      {
        type: "LESSON",
        selectedLessonIds: ["l2"],
        raw: { type: "LESSON", lessonId: "l1", selectedExerciseIds: ["ex-1"] },
      },
      options
    );
    expect(hints.join(" ")).toContain("Phần 1 / Bài 1");
    expect(hints.join(" ")).toContain("1 bài tập");
  });
});

describe("packageToFormValues", () => {
  it("map PackageView sang form và giữ raw của entitlement", () => {
    const pkg: CoursePackage = {
      id: "p1",
      name: "Premium",
      slug: "premium",
      status: "ACTIVE",
      salePrice: 700000,
      originalPrice: null,
      sortOrder: 2,
      defaultPackage: true,
      descriptions: null,
      entitlements: [{ id: "e1", type: "PART", sectionId: "sec-1", selectedLessonIds: null }],
    };
    expect(packageToFormValues(pkg)).toMatchObject({
      name: "Premium",
      slug: "premium",
      salePrice: 700000,
      sortOrder: 2,
      defaultPackage: true,
      entitlements: [{ type: "PART", sectionId: "sec-1", selectedLessonIds: [] }],
    });
  });
});
