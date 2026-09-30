import { describe, expect, it } from "vitest";
import { isEnvelopeSuccess, normalizeError } from "./client";
import { AxiosError } from "axios";

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

it("keeps safe clip failure messages without exposing other server errors", () => {
  const error = new AxiosError("HTTP 502");
  const body = { code: 502, message: "Thiếu đoạn video nguồn.", data: { errorCode: "CLIP_SOURCE_NOT_FOUND" } };
  error.config = { url: "/shortvideo/clips", headers: {} } as typeof error.config;
  error.response = {
    status: 502, data: body,
    statusText: "Bad Gateway", headers: {}, config: error.config!,
  };
  expect(normalizeError(error).message).toBe("Thiếu đoạn video nguồn.");
  error.config!.url = "/courses";
  expect(normalizeError(error).message).toBe("Máy chủ gặp lỗi. Vui lòng thử lại sau.");
  error.config!.url = "/shortvideo/clips";
  body.data.errorCode = "UNKNOWN_INTERNAL_ERROR";
  expect(normalizeError(error).message).toBe("Máy chủ gặp lỗi. Vui lòng thử lại sau.");
});
