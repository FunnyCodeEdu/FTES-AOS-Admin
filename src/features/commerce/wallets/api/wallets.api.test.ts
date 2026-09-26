import { describe, expect, it } from "vitest";
import { buildAdjustmentRequest } from "./wallets.api";

describe("buildAdjustmentRequest", () => {
  it("tạo đúng payload cộng Fcoin và giữ idempotency key", () => {
    expect(buildAdjustmentRequest("user-1", 44_000, "Thưởng sự kiện", "coin-once-1")).toEqual({
      userId: "user-1",
      amount: 44_000,
      direction: "CREDIT",
      reason: "Thưởng sự kiện",
      idempotencyKey: "coin-once-1",
    });
  });

  it("chuẩn hoá số âm thành lệnh thu hồi với amount dương", () => {
    expect(buildAdjustmentRequest("user-2", -5_000, "Thu hồi nhầm", "coin-once-2")).toEqual({
      userId: "user-2",
      amount: 5_000,
      direction: "DEBIT",
      reason: "Thu hồi nhầm",
      idempotencyKey: "coin-once-2",
    });
  });
});
