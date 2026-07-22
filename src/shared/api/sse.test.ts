import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dispatchSseBlock,
  parseSseBlock,
  streamSse,
  type SseDone,
  type SseHandlers,
} from "./sse";
// Fixtures qua ?raw (vite/client types + vitest xử lý natively — không cần node:fs).
import outlineStreamFixture from "../../features/academic/ai-assist/__fixtures__/sse/outline-stream.txt?raw";
import errorQuotaFixture from "../../features/academic/ai-assist/__fixtures__/sse/error-quota.txt?raw";

// Task 5.5 — admin-lecturer-ai-assist: parser SSE (fixtures delta/done/error/ping),
// buffering qua ranh giới chunk, space token đầu delta KHÔNG bị strip.

function collect() {
  const deltas: string[] = [];
  const dones: SseDone[] = [];
  const errors: string[] = [];
  const handlers: SseHandlers = {
    onDelta: (t) => deltas.push(t),
    onDone: (d) => dones.push(d),
    onError: (c) => errors.push(c),
  };
  return { deltas, dones, errors, handlers };
}

describe("parseSseBlock", () => {
  it("đọc event + data của 1 block", () => {
    expect(parseSseBlock("event: delta\ndata:# Dàn ý")).toEqual({
      event: "delta",
      data: "# Dàn ý",
    });
  });

  it("GIỮ space đầu sau `data:` (Spring không chèn space — strip sẽ nối sai từ)", () => {
    expect(parseSseBlock("event: delta\ndata: world").data).toBe(" world");
  });

  it("nhiều dòng data ghép bằng \\n", () => {
    expect(parseSseBlock("data:dòng 1\ndata:dòng 2").data).toBe("dòng 1\ndòng 2");
  });

  it("chịu CRLF (\\r cuối dòng)", () => {
    expect(parseSseBlock('event: done\r\ndata:{"a":1}\r')).toEqual({
      event: "done",
      data: '{"a":1}',
    });
  });

  it("bỏ dòng comment `:` (heartbeat ping) và field lạ", () => {
    expect(parseSseBlock(":ping")).toEqual({ event: "message", data: "" });
    expect(parseSseBlock(":ping\nid: 7\ndata:x").data).toBe("x");
  });

  it("thiếu event: → mặc định message", () => {
    expect(parseSseBlock("data:hello").event).toBe("message");
  });
});

describe("dispatchSseBlock", () => {
  it("delta → onDelta text thô", () => {
    const c = collect();
    dispatchSseBlock({ event: "delta", data: " chi tiết" }, c.handlers);
    expect(c.deltas).toEqual([" chi tiết"]);
    expect(c.errors).toEqual([]);
  });

  it("done JSON hợp lệ → object; JSON hỏng → {} (không ném)", () => {
    const c = collect();
    dispatchSseBlock(
      { event: "done", data: '{"messageId":"m1","tokenOutput":5,"modelUsed":"x"}' },
      c.handlers
    );
    dispatchSseBlock({ event: "done", data: "not-json" }, c.handlers);
    expect(c.dones).toEqual([{ messageId: "m1", tokenOutput: 5, modelUsed: "x" }, {}]);
  });

  it("error → code từ payload, thiếu code → AI_STREAM_ERROR", () => {
    const c = collect();
    dispatchSseBlock({ event: "error", data: '{"code":"AI_SESSION_BUSY"}' }, c.handlers);
    dispatchSseBlock({ event: "error", data: "oops" }, c.handlers);
    expect(c.errors).toEqual(["AI_SESSION_BUSY", "AI_STREAM_ERROR"]);
  });

  it("quota → code (default AI_LESSON_CHAT_LIMIT_EXCEEDED); event lạ bỏ qua", () => {
    const c = collect();
    dispatchSseBlock({ event: "quota", data: "{}" }, c.handlers);
    dispatchSseBlock({ event: "banana", data: "x" }, c.handlers);
    expect(c.errors).toEqual(["AI_LESSON_CHAT_LIMIT_EXCEEDED"]);
    expect(c.deltas).toEqual([]);
  });
});

// ---- streamSse với fetch giả (chunk cắt tuỳ ý — kể cả giữa ký tự UTF-8) ----

function streamResponse(payload: string, chunkSize: number): Response {
  const bytes = new TextEncoder().encode(payload);
  let offset = 0;
  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: async () => {
          if (offset >= bytes.length) return { done: true, value: undefined };
          const value = bytes.slice(offset, offset + chunkSize);
          offset += chunkSize;
          return { done: false, value };
        },
      }),
    },
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("streamSse", () => {
  it("fixture outline: ghép delta giữ nguyên space, done parse đúng (chunk 7 byte)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(streamResponse(outlineStreamFixture, 7))
    );
    const c = collect();
    await streamSse("/ai/sessions/s1/messages", { content: "x" }, c.handlers);
    expect(c.deltas.join("")).toBe("# Dàn ý chi tiết cho bài học");
    expect(c.dones).toEqual([
      {
        messageId: "11111111-1111-1111-1111-111111111111",
        tokenOutput: 42,
        modelUsed: "openrouter/auto",
      },
    ]);
    expect(c.errors).toEqual([]);
  });

  it("fixture error-quota: delta trước đó vẫn nhận, rồi onError đúng code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(streamResponse(errorQuotaFixture, 3))
    );
    const c = collect();
    await streamSse("/ai/sessions/s1/messages", {}, c.handlers);
    expect(c.deltas.join("")).toBe(" bắt đầu…");
    expect(c.errors).toEqual(["AI_QUOTA_EXCEEDED"]);
    expect(c.dones).toEqual([]);
  });

  it("response non-stream 403 → errorCode envelope nếu có, else AI_FEATURE_FORBIDDEN", async () => {
    const forbid = (envelope: unknown) =>
      ({ ok: false, status: 403, json: async () => envelope }) as unknown as Response;
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          forbid({ code: 403, message: "x", data: { errorCode: "AI_MODEL_NOT_ALLOWED" } })
        )
        .mockResolvedValueOnce(forbid({ code: 403, message: "x", data: null }))
    );
    const c = collect();
    await streamSse("/p", {}, c.handlers);
    await streamSse("/p", {}, c.handlers);
    expect(c.errors).toEqual(["AI_MODEL_NOT_ALLOWED", "AI_FEATURE_FORBIDDEN"]);
  });

  it("abort (nút Dừng) = im lặng: KHÔNG gọi onError", async () => {
    const abortErr = Object.assign(new Error("aborted"), { name: "AbortError" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: { getReader: () => ({ read: () => Promise.reject(abortErr) }) },
      } as unknown as Response)
    );
    const c = collect();
    await streamSse("/p", {}, c.handlers);
    expect(c.errors).toEqual([]);
  });

  it("fetch ném lỗi mạng → AI_NETWORK_ERROR", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("failed")));
    const c = collect();
    await streamSse("/p", {}, c.handlers);
    expect(c.errors).toEqual(["AI_NETWORK_ERROR"]);
  });
});
