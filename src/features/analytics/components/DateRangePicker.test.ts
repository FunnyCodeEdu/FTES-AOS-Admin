import dayjs from "dayjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_ANALYTICS_PRESET, getPresetRange } from "./DateRangePicker";

describe("analytics dashboard default date range", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 6, 8, 30, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults to today instead of a multi-day range", () => {
    expect(DEFAULT_ANALYTICS_PRESET).toBe("today");

    const [from, to] = getPresetRange(DEFAULT_ANALYTICS_PRESET);
    expect(from.format("YYYY-MM-DD")).toBe("2026-10-06");
    expect(to.format("YYYY-MM-DD")).toBe("2026-10-06");
    expect(from.isSame(dayjs().startOf("day"))).toBe(true);
    expect(to.isSame(dayjs().endOf("day"))).toBe(true);
  });

  it("keeps the existing 7, 30 and 90 day presets", () => {
    expect(getPresetRange("7")[0].format("YYYY-MM-DD")).toBe("2026-09-30");
    expect(getPresetRange("30")[0].format("YYYY-MM-DD")).toBe("2026-09-07");
    expect(getPresetRange("90")[0].format("YYYY-MM-DD")).toBe("2026-07-09");
  });
});
