import { describe, expect, it } from "vitest";
import {
  MAX_SKILL_EXP,
  SKILL_EXP_MILESTONES,
  availableCategoryOptions,
  milestoneBreakdown,
  normalizeEvaluateResult,
  normalizeSkillCategories,
  normalizeSkillExpRows,
  rowsEqual,
  toSkillExpPayload,
  validateSkillExpRows,
  type CourseSkillExpRow,
  type SkillCategory,
} from "./courses.api";

// admin-course-skill-exp §2 — helper thuần của tab "EXP kỹ năng", khớp `SkillExpDtos` +
// `CourseSkillExpService` của BE (change course-skill-exp).

const categories: SkillCategory[] = [
  { slug: "programming", label: "Programming", sortOrder: 1 },
  { slug: "database", label: "Database", sortOrder: 2 },
  { slug: "devops", label: "DevOps", sortOrder: 3 },
];

describe("normalizeSkillCategories", () => {
  it("nhận mảng trần, sắp theo sortOrder", () => {
    const raw = [
      { slug: "devops", label: "DevOps", sortOrder: 3 },
      { slug: "programming", label: "Programming", sortOrder: 1 },
    ];
    expect(normalizeSkillCategories(raw).map((c) => c.slug)).toEqual(["programming", "devops"]);
  });

  it("nhận cả payload bọc {items} / {categories} và khoá tên khác (code/name)", () => {
    expect(
      normalizeSkillCategories({ items: [{ code: "testing", name: "Testing", order: 7 }] })
    ).toEqual([{ slug: "testing", label: "Testing", sortOrder: 7 }]);
    expect(normalizeSkillCategories({ categories: [{ slug: "security", label: "Security" }] })).toEqual(
      [{ slug: "security", label: "Security" }]
    );
  });

  it("bỏ mục thiếu slug, khử trùng slug, label rỗng thì lấy slug", () => {
    const out = normalizeSkillCategories([
      { label: "Không có slug" },
      { slug: "database", label: "Database" },
      { slug: "database", label: "Trùng" },
      { slug: "testing" },
    ]);
    expect(out.map((c) => c.slug)).toEqual(["database", "testing"]);
    expect(out.find((c) => c.slug === "testing")?.label).toBe("testing");
  });

  it("payload rác (null / object lạ / chuỗi) → mảng rỗng, không ném", () => {
    expect(normalizeSkillCategories(null)).toEqual([]);
    expect(normalizeSkillCategories("")).toEqual([]);
    expect(normalizeSkillCategories({ foo: 1 })).toEqual([]);
  });

  it("thiếu sortOrder thì xếp sau, rồi sắp theo label", () => {
    const out = normalizeSkillCategories([
      { slug: "zeta", label: "Zeta" },
      { slug: "alpha", label: "Alpha" },
      { slug: "first", label: "First", sortOrder: 0 },
    ]);
    expect(out.map((c) => c.slug)).toEqual(["first", "alpha", "zeta"]);
  });
});

describe("normalizeSkillExpRows", () => {
  it("AllocationView của BE: {categorySlug, categoryLabel, exp, rationale, source}", () => {
    expect(
      normalizeSkillExpRows([
        {
          categorySlug: "programming",
          categoryLabel: "Programming",
          exp: 120,
          rationale: "Nhiều bài code",
          source: "AI",
        },
      ])
    ).toEqual([
      {
        categorySlug: "programming",
        categoryLabel: "Programming",
        exp: 120,
        rationale: "Nhiều bài code",
        source: "AI",
      },
    ]);
  });

  it("chấp payload bọc {items} (EvaluateResult) và các tên khoá thay thế", () => {
    expect(
      normalizeSkillExpRows({
        items: [{ category: "database", expAmount: 60, reason: "Có chương SQL" }],
      })
    ).toEqual([{ categorySlug: "database", exp: 60, rationale: "Có chương SQL" }]);
  });

  it("EXP chuỗi/số lẻ → số nguyên ≥ 0; thiếu EXP → 0", () => {
    const out = normalizeSkillExpRows([
      { categorySlug: "a", exp: "45" },
      { categorySlug: "b", exp: 12.9 },
      { categorySlug: "c", exp: -5 },
      { categorySlug: "d" },
    ]);
    expect(out.map((r) => r.exp)).toEqual([45, 12, 0, 0]);
  });

  it("bỏ dòng không có slug và khử trùng nhóm (giữ bản ghi ĐẦU)", () => {
    const out = normalizeSkillExpRows([
      { exp: 10, rationale: "mồ côi" },
      { categorySlug: "devops", exp: 30, rationale: "đầu" },
      { categorySlug: "devops", exp: 99, rationale: "sau" },
    ]);
    expect(out).toEqual([{ categorySlug: "devops", exp: 30, rationale: "đầu" }]);
  });

  it("source lạ bị bỏ, source hợp lệ giữ nguyên (không bịa MANUAL)", () => {
    expect(normalizeSkillExpRows([{ categorySlug: "a", exp: 1, source: "ROBOT" }])[0].source).toBeUndefined();
    expect(normalizeSkillExpRows([{ categorySlug: "a", exp: 1, source: "manual" }])[0].source).toBe(
      "MANUAL"
    );
  });

  it("PUT trả 204 (body rỗng) / lỗi parse → mảng rỗng thay vì ném", () => {
    expect(normalizeSkillExpRows("")).toEqual([]);
    expect(normalizeSkillExpRows(undefined)).toEqual([]);
  });
});

describe("toSkillExpPayload", () => {
  it("khoá body PHẢI là `items` (ReplaceAllocationBody), lý do rỗng → null", () => {
    const payload = toSkillExpPayload([
      { categorySlug: "programming", exp: 100, rationale: "  nhiều bài code  " },
      { categorySlug: "database", exp: 40, rationale: "   " },
    ]);
    // Sai tên khoá ⇒ BE 400 "items không được thiếu" — chốt bằng test để không lặng lẽ đổi.
    expect(Object.keys(payload)).toEqual(["items"]);
    expect(payload).toEqual({
      items: [
        { categorySlug: "programming", exp: 100, rationale: "nhiều bài code" },
        { categorySlug: "database", exp: 40, rationale: null },
      ],
    });
  });

  it("KHÔNG gửi categoryLabel/source (AllocationInput chỉ có 3 field)", () => {
    const payload = toSkillExpPayload([
      { categorySlug: "devops", categoryLabel: "DevOps", exp: 10, rationale: "", source: "AI" },
    ]);
    expect(Object.keys(payload.items[0])).toEqual(["categorySlug", "exp", "rationale"]);
  });

  it("bỏ dòng chưa chọn nhóm và dòng EXP ≤ 0 (BE ràng exp_amount > 0)", () => {
    expect(
      toSkillExpPayload([
        { categorySlug: "", exp: 50, rationale: "chưa chọn nhóm" },
        { categorySlug: "devops", exp: 0, rationale: "chưa nhập điểm" },
        { categorySlug: "testing", exp: 20, rationale: "ok" },
      ]).items
    ).toEqual([{ categorySlug: "testing", exp: 20, rationale: "ok" }]);
  });

  it("EXP lẻ bị cắt xuống số nguyên, nhóm trùng chỉ gửi một lần", () => {
    const payload = toSkillExpPayload([
      { categorySlug: "a", exp: 7.8, rationale: "" },
      { categorySlug: "a", exp: 99, rationale: "" },
    ]);
    expect(payload.items).toEqual([{ categorySlug: "a", exp: 7, rationale: null }]);
  });

  it("bộ rỗng vẫn hợp lệ — replace-set rỗng = khoá không cấp EXP", () => {
    expect(toSkillExpPayload([])).toEqual({ items: [] });
  });
});

describe("normalizeEvaluateResult", () => {
  it("EvaluateResult {items, ignoredSlugs, clampedSlugs} → rows + cảnh báo", () => {
    expect(
      normalizeEvaluateResult({
        items: [{ categorySlug: "database", categoryLabel: "Database", exp: 60, rationale: "SQL" }],
        ignoredSlugs: ["quantum-computing", "database (lặp)"],
        clampedSlugs: ["database: 5000→1000"],
      })
    ).toEqual({
      rows: [
        { categorySlug: "database", categoryLabel: "Database", exp: 60, rationale: "SQL" },
      ],
      ignoredSlugs: ["quantum-computing", "database (lặp)"],
      clampedSlugs: ["database: 5000→1000"],
    });
  });

  it("thiếu hai mảng cảnh báo / payload rác → mảng rỗng, không ném", () => {
    expect(normalizeEvaluateResult({ items: [] })).toEqual({
      rows: [],
      ignoredSlugs: [],
      clampedSlugs: [],
    });
    expect(normalizeEvaluateResult(null)).toEqual({
      rows: [],
      ignoredSlugs: [],
      clampedSlugs: [],
    });
  });

  it("mục rỗng trong ignoredSlugs bị loại (không hiện gạch đầu dòng trống)", () => {
    expect(
      normalizeEvaluateResult({ items: [], ignoredSlugs: ["", "  ", "x", 7] }).ignoredSlugs
    ).toEqual(["x"]);
  });
});

describe("validateSkillExpRows", () => {
  const ok: CourseSkillExpRow = { categorySlug: "programming", exp: 100, rationale: "" };

  it("bộ hợp lệ (kể cả bộ rỗng) → không lỗi", () => {
    expect(validateSkillExpRows([ok], categories)).toEqual([]);
    expect(validateSkillExpRows([], categories)).toEqual([]);
  });

  it("dòng chưa chọn nhóm → báo lỗi", () => {
    expect(validateSkillExpRows([{ categorySlug: "", exp: 10, rationale: "" }])).toContain(
      "Có dòng chưa chọn nhóm kỹ năng."
    );
  });

  it("EXP 0 / âm / lẻ → lỗi kèm LABEL của nhóm, không phải slug thô", () => {
    const errors = validateSkillExpRows(
      [{ categorySlug: "database", exp: 0, rationale: "" }],
      categories
    );
    expect(errors).toEqual(['Nhóm "Database": EXP phải là số nguyên trong khoảng 1–1000.']);
    expect(validateSkillExpRows([{ categorySlug: "database", exp: 2.5, rationale: "" }])).toHaveLength(1);
  });

  it("EXP vượt trần 1000 của BE bị chặn TẠI CHỖ (không để BE trả 400)", () => {
    expect(
      validateSkillExpRows(
        [{ categorySlug: "devops", exp: MAX_SKILL_EXP + 1, rationale: "" }],
        categories
      )
    ).toHaveLength(1);
    expect(
      validateSkillExpRows([{ categorySlug: "devops", exp: MAX_SKILL_EXP, rationale: "" }], categories)
    ).toEqual([]);
  });

  it("slug không có trong danh mục → chặn (BE replaceManual trả 400)", () => {
    expect(
      validateSkillExpRows([{ categorySlug: "quantum", exp: 10, rationale: "" }], categories)
    ).toContain('Nhóm "quantum" không có trong danh mục — chọn lại nhóm khác hoặc xoá dòng này.');
  });

  it("danh mục CHƯA tải được → KHÔNG chặn oan mọi dòng", () => {
    expect(validateSkillExpRows([{ categorySlug: "quantum", exp: 10, rationale: "" }], [])).toEqual(
      []
    );
  });

  it("nhóm lặp → đúng một lỗi cho nhóm đó", () => {
    const errors = validateSkillExpRows(
      [
        { categorySlug: "devops", exp: 10, rationale: "" },
        { categorySlug: "devops", exp: 20, rationale: "" },
        { categorySlug: "devops", exp: 30, rationale: "" },
      ],
      categories
    );
    expect(errors).toEqual(['Nhóm "DevOps" bị lặp — mỗi nhóm chỉ được một dòng.']);
  });
});

describe("milestoneBreakdown", () => {
  it("bốn mốc đúng 30/50/80/100 theo hợp đồng BE", () => {
    expect(milestoneBreakdown(100).map((m) => m.percent)).toEqual([...SKILL_EXP_MILESTONES]);
  });

  it("100 EXP → 30 / 20 / 30 / 20 (ví dụ trong proposal BE)", () => {
    expect(milestoneBreakdown(100).map((m) => m.award)).toEqual([30, 20, 30, 20]);
  });

  it("chia không hết: làm tròn XUỐNG từng mốc, mốc 100% lấy phần dư", () => {
    const out = milestoneBreakdown(7);
    // floor(2.1)=2 → +2 ; floor(3.5)=3 → +1 ; floor(5.6)=5 → +2 ; 7 → +2
    expect(out.map((m) => m.award)).toEqual([2, 1, 2, 2]);
    expect(out.map((m) => m.cumulative)).toEqual([2, 3, 5, 7]);
  });

  it("tổng 4 mốc LUÔN bằng đúng EXP cấu hình (không hụt vì làm tròn)", () => {
    for (let exp = 0; exp <= 250; exp += 1) {
      const total = milestoneBreakdown(exp).reduce((sum, m) => sum + m.award, 0);
      expect(total).toBe(exp);
    }
  });

  it("cumulative không giảm và EXP ≤ 0 / rác → toàn 0", () => {
    const out = milestoneBreakdown(37);
    expect(out.every((m, i) => (i === 0 ? true : m.cumulative >= out[i - 1].cumulative))).toBe(true);
    expect(milestoneBreakdown(0).map((m) => m.award)).toEqual([0, 0, 0, 0]);
    expect(milestoneBreakdown(-10).map((m) => m.award)).toEqual([0, 0, 0, 0]);
    expect(milestoneBreakdown(Number.NaN).map((m) => m.award)).toEqual([0, 0, 0, 0]);
  });
});

describe("availableCategoryOptions", () => {
  it("chỉ nhóm chưa dùng ở dòng khác", () => {
    expect(
      availableCategoryOptions(categories, [
        { categorySlug: "programming", exp: 10, rationale: "" },
      ]).map((o) => o.value)
    ).toEqual(["database", "devops"]);
  });

  it("giữ lại nhóm của CHÍNH dòng đang sửa (không thì Select mất giá trị)", () => {
    const rows: CourseSkillExpRow[] = [
      { categorySlug: "programming", exp: 10, rationale: "" },
      { categorySlug: "database", exp: 10, rationale: "" },
    ];
    expect(availableCategoryOptions(categories, rows, "database").map((o) => o.value)).toEqual([
      "database",
      "devops",
    ]);
  });

  it("dòng chưa chọn nhóm không chiếm chỗ của nhóm nào", () => {
    expect(
      availableCategoryOptions(categories, [{ categorySlug: "", exp: 0, rationale: "" }])
    ).toHaveLength(3);
  });
});

describe("rowsEqual", () => {
  const saved: CourseSkillExpRow[] = [
    { categorySlug: "programming", exp: 100, rationale: "code nhiều", source: "AI" },
    { categorySlug: "database", exp: 40, rationale: "", source: "AI" },
  ];

  it("đổi thứ tự dòng / đổi source / thêm khoảng trắng lý do → vẫn coi là chưa sửa", () => {
    expect(
      rowsEqual(saved, [
        { categorySlug: "database", exp: 40, rationale: " ", source: "MANUAL" },
        { categorySlug: "programming", exp: 100, rationale: "code nhiều  ", source: "MANUAL" },
      ])
    ).toBe(true);
  });

  it("đổi EXP / đổi lý do / xoá dòng → đã sửa", () => {
    expect(rowsEqual(saved, [{ ...saved[0], exp: 101 }, saved[1]])).toBe(false);
    expect(rowsEqual(saved, [{ ...saved[0], rationale: "khác" }, saved[1]])).toBe(false);
    expect(rowsEqual(saved, [saved[0]])).toBe(false);
  });

  it("dòng mới thêm nhưng CHƯA chọn nhóm / EXP 0 (payload bỏ) → chưa coi là sửa", () => {
    expect(rowsEqual(saved, [...saved, { categorySlug: "", exp: 10, rationale: "" }])).toBe(true);
    expect(rowsEqual(saved, [...saved, { categorySlug: "devops", exp: 0, rationale: "" }])).toBe(
      true
    );
  });
});
