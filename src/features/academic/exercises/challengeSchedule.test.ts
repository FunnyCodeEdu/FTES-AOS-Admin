import { describe, expect, it } from "vitest";
import {
  formatChallengeCloseTime,
  formatChallengeSchedule,
  isUnlimitedClose,
  NO_CLOSE_LABEL,
  OPEN_NOW_LABEL,
} from "./challengeSchedule";

// challenge-testcase-editor §4.3 — hiển thị lịch mở/đóng khi thời gian đóng là tuỳ chọn.

describe("isUnlimitedClose", () => {
  it("null / undefined / chuỗi rỗng → vô hạn", () => {
    expect(isUnlimitedClose(null)).toBe(true);
    expect(isUnlimitedClose(undefined)).toBe(true);
    expect(isUnlimitedClose("")).toBe(true);
  });

  it("sentinel dữ liệu cũ (năm ≥ 2999) cũng coi là vô hạn", () => {
    expect(isUnlimitedClose("2999-12-31T00:00:00Z")).toBe(true);
  });

  it("mốc đóng thật → không vô hạn", () => {
    expect(isUnlimitedClose("2026-08-01T00:00:00Z")).toBe(false);
  });
});

describe("formatChallengeSchedule", () => {
  it("vắng thời gian đóng → 'Không giới hạn'", () => {
    expect(formatChallengeSchedule("2026-07-01T00:00:00Z", null)).toContain(NO_CLOSE_LABEL);
    expect(formatChallengeCloseTime(null)).toBe(NO_CLOSE_LABEL);
  });

  it("vắng thời gian mở → 'Mở ngay'", () => {
    expect(formatChallengeSchedule(null, null)).toBe(`${OPEN_NOW_LABEL} → ${NO_CLOSE_LABEL}`);
  });

  it("có đủ 2 mốc → 'mở → đóng' theo DD/MM/YYYY HH:mm", () => {
    const text = formatChallengeSchedule("2026-07-01T03:30:00Z", "2026-08-01T03:30:00Z");
    expect(text).toMatch(/^\d{2}\/\d{2}\/2026 \d{2}:\d{2} → \d{2}\/\d{2}\/2026 \d{2}:\d{2}$/);
  });

  it("chuỗi ngày hỏng không làm vỡ UI", () => {
    expect(formatChallengeSchedule("khong-phai-ngay", "cung-khong-phai")).toBe(
      `${OPEN_NOW_LABEL} → ${NO_CLOSE_LABEL}`
    );
  });
});
