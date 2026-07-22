import { describe, expect, it } from "vitest";
import {
  AI_JOB_POLL_INTERVAL_MS,
  isTerminalJobStatus,
  nextPollInterval,
  parseJobResult,
} from "./useAiJobPolling";

// Task 1.4 — admin-lecturer-ai-assist: polling dừng ĐÚNG điều kiện (terminal) và chỉ khi đó.

describe("isTerminalJobStatus", () => {
  it("COMPLETED/FAILED/CANCELLED là terminal", () => {
    expect(isTerminalJobStatus("COMPLETED")).toBe(true);
    expect(isTerminalJobStatus("FAILED")).toBe(true);
    expect(isTerminalJobStatus("CANCELLED")).toBe(true);
  });

  it("PENDING/RUNNING/chưa có status KHÔNG terminal", () => {
    expect(isTerminalJobStatus("PENDING")).toBe(false);
    expect(isTerminalJobStatus("RUNNING")).toBe(false);
    expect(isTerminalJobStatus(undefined)).toBe(false);
    expect(isTerminalJobStatus(null)).toBe(false);
  });
});

describe("nextPollInterval (refetchInterval của react-query)", () => {
  it("còn chạy / chưa có data → giữ nhịp 2.5s", () => {
    expect(nextPollInterval("PENDING")).toBe(AI_JOB_POLL_INTERVAL_MS);
    expect(nextPollInterval("RUNNING")).toBe(AI_JOB_POLL_INTERVAL_MS);
    expect(nextPollInterval(undefined)).toBe(AI_JOB_POLL_INTERVAL_MS);
  });

  it("terminal → false (react-query DỪNG poll ngay lần đó)", () => {
    expect(nextPollInterval("COMPLETED")).toBe(false);
    expect(nextPollInterval("FAILED")).toBe(false);
    expect(nextPollInterval("CANCELLED")).toBe(false);
  });
});

describe("parseJobResult", () => {
  it("JSON-string → object (tool có cấu trúc)", () => {
    expect(parseJobResult<{ questions: unknown[] }>('{"questions":[]}')).toEqual({
      questions: [],
    });
  });

  it("không parse được → trả nguyên chuỗi (markdown thô)", () => {
    expect(parseJobResult<string>("## Phân tích độ khó")).toBe("## Phân tích độ khó");
  });

  it("chưa có result (null/undefined/rỗng) → undefined", () => {
    expect(parseJobResult(null)).toBeUndefined();
    expect(parseJobResult(undefined)).toBeUndefined();
    expect(parseJobResult("")).toBeUndefined();
  });
});
