import { describe, expect, it } from "vitest";
import {
  categorySelectOptions,
  formatMilestoneHint,
  isUnknownCategory,
  stripDraftKeys,
  toDraftRows,
  type SkillExpDraftRow,
} from "./CourseSkillExpTab";
import type { CourseSkillExpRow, SkillCategory } from "../api/courses.api";

// admin-course-skill-exp §3 — helper thuần của tab (khoá React + copy luật trả điểm + options Select).

const categories: SkillCategory[] = [
  { slug: "programming", label: "Programming", sortOrder: 1 },
  { slug: "database", label: "Database", sortOrder: 2 },
];

describe("toDraftRows / stripDraftKeys", () => {
  it("gắn khoá React duy nhất cho mọi dòng, kể cả dòng chưa chọn nhóm", () => {
    const draft = toDraftRows([
      { categorySlug: "", exp: 10, rationale: "" },
      { categorySlug: "", exp: 20, rationale: "" },
    ]);
    expect(new Set(draft.map((r) => r.key)).size).toBe(2);
  });

  it("prefix khác nhau ⇒ khoá khác nhau (thay nguyên bộ sau khi AI chấm, Table không tái dùng ô cũ)", () => {
    const first = toDraftRows([{ categorySlug: "a", exp: 1, rationale: "" }], "saved");
    const second = toDraftRows([{ categorySlug: "b", exp: 2, rationale: "" }], "ai-1");
    expect(first[0].key).not.toBe(second[0].key);
  });

  it("stripDraftKeys bỏ key, giữ nguyên dữ liệu nghiệp vụ và bỏ source khi không có", () => {
    const draft: SkillExpDraftRow[] = [
      { key: "k1", categorySlug: "programming", exp: 100, rationale: "vì code", source: "AI" },
      { key: "k2", categorySlug: "database", exp: 40, rationale: "" },
    ];
    const plain: CourseSkillExpRow[] = stripDraftKeys(draft);
    expect(plain).toEqual([
      { categorySlug: "programming", exp: 100, rationale: "vì code", source: "AI" },
      { categorySlug: "database", exp: 40, rationale: "" },
    ]);
    expect(plain[1]).not.toHaveProperty("source");
  });

  it("khứ hồi draft → plain → draft giữ nguyên nội dung, kể cả categoryLabel của BE", () => {
    const rows: CourseSkillExpRow[] = [
      { categorySlug: "devops", categoryLabel: "DevOps", exp: 60, rationale: "CI/CD" },
    ];
    expect(stripDraftKeys(toDraftRows(rows))).toEqual(rows);
  });
});

describe("formatMilestoneHint", () => {
  it("hiện đủ 4 mốc và phần cộng thêm mỗi mốc", () => {
    expect(formatMilestoneHint(100)).toBe("30% → +30 · 50% → +20 · 80% → +30 · 100% → +20");
  });

  it("số chia không hết vẫn hiện đủ 4 mốc, tổng bằng EXP cấu hình", () => {
    const hint = formatMilestoneHint(7);
    expect(hint).toBe("30% → +2 · 50% → +1 · 80% → +2 · 100% → +2");
    const sum = [...hint.matchAll(/\+(\d+)/g)].reduce((acc, m) => acc + Number(m[1]), 0);
    expect(sum).toBe(7);
  });

  it("EXP chưa nhập (0) → mọi mốc +0, không vỡ chuỗi", () => {
    expect(formatMilestoneHint(0)).toBe("30% → +0 · 50% → +0 · 80% → +0 · 100% → +0");
  });
});

describe("isUnknownCategory", () => {
  it("slug có trong danh mục → false; slug lạ → true", () => {
    expect(isUnknownCategory("programming", categories)).toBe(false);
    expect(isUnknownCategory("quantum", categories)).toBe(true);
  });

  it("danh mục CHƯA tải xong hoặc dòng chưa chọn nhóm → chưa kết luận (false)", () => {
    expect(isUnknownCategory("programming", [])).toBe(false);
    expect(isUnknownCategory("", categories)).toBe(false);
  });
});

describe("categorySelectOptions", () => {
  it("giữ được nhóm của dòng hiện tại DÙ nhóm đó không còn trong danh mục", () => {
    const rows: CourseSkillExpRow[] = [{ categorySlug: "legacy-slug", exp: 10, rationale: "" }];
    const options = categorySelectOptions(categories, rows, "legacy-slug");
    expect(options[0]).toEqual({ value: "legacy-slug", label: "legacy-slug" });
    expect(options.map((o) => o.value)).toEqual(["legacy-slug", "programming", "database"]);
  });

  it("nhóm lạ hiện bằng categoryLabel BE trả kèm, không phải slug thô", () => {
    const rows: CourseSkillExpRow[] = [
      { categorySlug: "legacy-slug", categoryLabel: "Nhóm đã gỡ", exp: 10, rationale: "" },
    ];
    expect(categorySelectOptions(categories, rows, "legacy-slug", "Nhóm đã gỡ")[0]).toEqual({
      value: "legacy-slug",
      label: "Nhóm đã gỡ",
    });
  });

  it("nhóm đã dùng ở dòng khác bị loại khỏi options", () => {
    const rows: CourseSkillExpRow[] = [
      { categorySlug: "programming", exp: 10, rationale: "" },
      { categorySlug: "", exp: 10, rationale: "" },
    ];
    expect(categorySelectOptions(categories, rows, "").map((o) => o.value)).toEqual(["database"]);
  });

  it("không nhân đôi option khi nhóm hiện tại vẫn nằm trong danh mục", () => {
    const rows: CourseSkillExpRow[] = [{ categorySlug: "database", exp: 10, rationale: "" }];
    const values = categorySelectOptions(categories, rows, "database").map((o) => o.value);
    expect(values).toEqual(["programming", "database"]);
  });
});
