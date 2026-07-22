import { describe, expect, it } from "vitest";
import { isEnvelopeSuccess } from "./client";

// Task 1.4 — admin-lecturer-ai-assist: interceptor phải bóc envelope cả 1002 ("Accepted",
// data = JobRef của job AI async), không chỉ 2xx.

describe("isEnvelopeSuccess", () => {
  it("2xx là success", () => {
    expect(isEnvelopeSuccess(200)).toBe(true);
    expect(isEnvelopeSuccess(201)).toBe(true);
    expect(isEnvelopeSuccess(299)).toBe(true);
  });

  it("1002 (Accepted — JobRef) cũng là success để unwrap data", () => {
    expect(isEnvelopeSuccess(1002)).toBe(true);
  });

  it("code lỗi/ngoài dải KHÔNG phải success", () => {
    expect(isEnvelopeSuccess(199)).toBe(false);
    expect(isEnvelopeSuccess(300)).toBe(false);
    expect(isEnvelopeSuccess(400)).toBe(false);
    expect(isEnvelopeSuccess(1001)).toBe(false);
    expect(isEnvelopeSuccess(1003)).toBe(false);
  });
});
