import { describe, expect, it } from "vitest";
import { isCoinOutOfGuideline, needsDisableConfirm } from "./QuestsPage";

// Nợ quality-loop admin-gamification-console 2.4 (phần unit): confirm chặn tắt nhầm quest
// + cảnh báo vàng khi xu ngoài khung kinh tế 50–100.

describe("needsDisableConfirm — Modal.confirm chỉ khi tắt quest đang active", () => {
  it("tắt quest đang active → PHẢI confirm (người học mất nguồn xu)", () => {
    expect(needsDisableConfirm({ active: true }, false)).toBe(true);
  });

  it("bật lại quest → không confirm", () => {
    expect(needsDisableConfirm({ active: true }, true)).toBe(false);
    expect(needsDisableConfirm({ active: false }, true)).toBe(false);
  });

  it("quest BE đã tắt sẵn (Switch trễ) → không hỏi lại", () => {
    expect(needsDisableConfirm({ active: false }, false)).toBe(false);
  });
});

describe("isCoinOutOfGuideline — khung kinh tế 50–100 xu", () => {
  it("trong khung 50–100 (kể cả biên) → không cảnh báo", () => {
    expect(isCoinOutOfGuideline(50)).toBe(false);
    expect(isCoinOutOfGuideline(75)).toBe(false);
    expect(isCoinOutOfGuideline(100)).toBe(false);
  });

  it("ngoài khung → cảnh báo vàng", () => {
    expect(isCoinOutOfGuideline(49)).toBe(true);
    expect(isCoinOutOfGuideline(101)).toBe(true);
    expect(isCoinOutOfGuideline(1)).toBe(true);
  });
});
