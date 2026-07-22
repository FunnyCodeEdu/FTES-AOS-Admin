import { describe, expect, it } from "vitest";
import { isPoolBalanced, sumPoolProbability } from "./RewardPoolItemsDrawer";

// Nợ quality-loop admin-gamification-console 4.3 (phần unit): hiển thị tổng probability phải
// ĐỒNG Ý với gate BE validateRewardPool (|tổng − 1.0| < 1e-6) — không dùng toFixed để so.

describe("sumPoolProbability", () => {
  it("pool rỗng → 0", () => {
    expect(sumPoolProbability([])).toBe(0);
  });

  it("cộng đúng các item", () => {
    expect(
      sumPoolProbability([{ probability: 0.25 }, { probability: 0.25 }, { probability: 0.5 }])
    ).toBe(1);
  });

  it("probability null/undefined (data xấu) coi là 0 — không NaN", () => {
    expect(
      sumPoolProbability([
        { probability: 0.5 },
        { probability: null as unknown as number },
        { probability: undefined as unknown as number },
      ])
    ).toBe(0.5);
  });
});

describe("isPoolBalanced — khớp epsilon BE 1e-6", () => {
  it("đúng 1.0 → hợp lệ", () => {
    expect(isPoolBalanced(1)).toBe(true);
  });

  it("sai số float (10 × 0.1 = 0.999…9) vẫn hợp lệ", () => {
    const total = sumPoolProbability(Array.from({ length: 10 }, () => ({ probability: 0.1 })));
    expect(total).not.toBe(1); // đúng là có sai số float
    expect(isPoolBalanced(total)).toBe(true);
  });

  it("0.99996 KHÔNG hợp lệ — dù toFixed(4) hiển thị '1.0000' (bẫy làm tròn)", () => {
    expect((0.99996).toFixed(4)).toBe("1.0000");
    expect(isPoolBalanced(0.99996)).toBe(false);
  });

  it("lệch hẳn (tổng ≤ 1 nhưng ≠ 1, hoặc > 1) → không hợp lệ", () => {
    expect(isPoolBalanced(0.75)).toBe(false);
    expect(isPoolBalanced(1.25)).toBe(false);
    expect(isPoolBalanced(0)).toBe(false);
  });
});
