// Client SSE fetch-stream dùng chung (design admin-lecturer-ai-assist §7.2).
//
// `EventSource` không POST được + không gắn header Authorization → dùng `fetch` với ReadableStream.
// POST `${API_ROOT}/api/v1${path}`, Bearer từ useAuthStore (cùng nguồn interceptor axios), parse
// buffer theo spec SSE (tách `\n\n`, đọc `event:`/`data:`, BỎ QUA dòng comment `:` = heartbeat ping
// 15s của BE). Map event: delta→onDelta(text thô), done→onDone(JSON {messageId,tokenOutput,modelUsed}),
// error→onError(code). 401 giữa luồng → refresh 1 lần rồi retry (mirror interceptor). Abort = nút Dừng:
// bỏ lượt im lặng (BE tự release session lock khi stream đóng).

import { useAuthStore } from "../../features/auth/store";
import { refreshAccessToken } from "./client";

const API_ROOT = import.meta.env.VITE_API_BASE_URL ?? "";

/** Payload event `done` của BE SessionController.doneEventData. */
export interface SseDone {
  messageId?: string;
  tokenOutput?: number;
  modelUsed?: string | null;
}

export interface SseHandlers {
  onDelta: (text: string) => void;
  onDone: (data: SseDone) => void;
  /** code SSE error (`AI_QUOTA_EXCEEDED`, `AI_SESSION_BUSY`, …) hoặc code suy ra từ HTTP. */
  onError: (code: string) => void;
}

/** Một event SSE đã tách khỏi buffer (event name + data đã ghép nhiều dòng `data:`). */
export interface ParsedSseBlock {
  event: string;
  data: string;
}

/**
 * Parse MỘT block SSE (phần giữa 2 dấu `\n\n`) → {event, data}. Pure/không side-effect (unit test).
 * - Bỏ dòng comment (bắt đầu `:`) = heartbeat ping.
 * - `event:` đặt tên (mặc định "message"); nhiều dòng `data:` ghép bằng `\n`. Chịu CRLF (`\r` cuối dòng).
 * - QUAN TRỌNG: `data:` dùng `slice(5)` — KHÔNG strip space sau dấu `:` (mirror parser learner FE
 *   src/modules/api/rest/ai/ai.ts). Spring SseEmitter ghi `data:<delta>` KHÔNG chèn space, nên delta
 *   token bắt đầu bằng space (vd " world") sẽ mất space nếu strip → nối sai ("Helloworld").
 */
export function parseSseBlock(raw: string): ParsedSseBlock {
  let event = "message";
  const dataLines: string[] = [];
  for (const rawLine of raw.split("\n")) {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    if (line === "" || line.startsWith(":")) continue;
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5));
    // id/retry và field lạ: bỏ qua.
  }
  return { event, data: dataLines.join("\n") };
}

function safeJson<T>(data: string): T | undefined {
  try {
    return JSON.parse(data) as T;
  } catch {
    return undefined;
  }
}

/** Dispatch 1 block đã parse tới handlers. Pure trừ việc gọi callback. */
export function dispatchSseBlock(block: ParsedSseBlock, handlers: SseHandlers): void {
  switch (block.event) {
    case "delta":
      handlers.onDelta(block.data);
      break;
    case "done":
      handlers.onDone(safeJson<SseDone>(block.data) ?? {});
      break;
    case "error": {
      const code = safeJson<{ code?: string }>(block.data)?.code;
      handlers.onError(code || "AI_STREAM_ERROR");
      break;
    }
    case "quota": {
      // Chỉ áp per-lesson TUTOR_CHAT (không kỳ vọng ở LESSON_SUGGESTION) — vẫn xử lý phòng thủ.
      const code = safeJson<{ code?: string }>(block.data)?.code;
      handlers.onError(code || "AI_LESSON_CHAT_LIMIT_EXCEEDED");
      break;
    }
    default:
      // message/heartbeat khác: bỏ qua.
      break;
  }
}

/** Suy ra code lỗi từ response KHÔNG phải stream (400/403/5xx trước khi emitter mở). */
async function errorCodeFromResponse(res: Response): Promise<string> {
  try {
    const envelope = (await res.json()) as {
      code?: number;
      message?: string;
      data?: { errorCode?: string; missingPermissions?: string[] } | null;
    };
    if (envelope?.data?.errorCode) return envelope.data.errorCode;
  } catch {
    // body không phải JSON: rơi xuống fallback theo status.
  }
  if (res.status === 403) return "AI_FEATURE_FORBIDDEN";
  if (res.status === 404) return "AI_SESSION_NOT_FOUND";
  if (res.status === 401) return "AI_UNAUTHORIZED";
  return `HTTP_${res.status}`;
}

function doFetch(path: string, body: unknown, token: string | null, signal?: AbortSignal) {
  return fetch(`${API_ROOT}/api/v1${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });
}

/**
 * POST `path` (dưới /api/v1) và stream SSE tới handlers. Trả về khi stream đóng (done/error/abort).
 * Abort qua `signal` = bỏ lượt: KHÔNG gọi onError (im lặng). Lỗi mạng/parse giữa luồng → onError.
 */
export async function streamSse(
  path: string,
  body: unknown,
  handlers: SseHandlers,
  signal?: AbortSignal,
): Promise<void> {
  let res: Response;
  try {
    res = await doFetch(path, body, useAuthStore.getState().accessToken, signal);
    if (res.status === 401) {
      // 401 giữa/đầu luồng → refresh 1 lần rồi retry (mirror interceptor). Refresh fail → báo lỗi.
      let fresh: string;
      try {
        fresh = await refreshAccessToken();
      } catch {
        handlers.onError("AI_UNAUTHORIZED");
        return;
      }
      res = await doFetch(path, body, fresh, signal);
    }
  } catch (err) {
    if ((err as Error)?.name === "AbortError") return;
    handlers.onError("AI_NETWORK_ERROR");
    return;
  }

  if (!res.ok || !res.body) {
    handlers.onError(await errorCodeFromResponse(res));
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const rawBlock = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        dispatchSseBlock(parseSseBlock(rawBlock), handlers);
      }
    }
    // Block cuối không kết bằng `\n\n` (nếu có).
    const tail = buffer.trim();
    if (tail) dispatchSseBlock(parseSseBlock(buffer), handlers);
  } catch (err) {
    if ((err as Error)?.name === "AbortError") return; // nút Dừng: im lặng.
    handlers.onError("AI_STREAM_INTERRUPTED");
  }
}
