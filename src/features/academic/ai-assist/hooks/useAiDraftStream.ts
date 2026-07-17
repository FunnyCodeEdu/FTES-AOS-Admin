// Hook stream AI soạn thảo lesson (design §7.2). Quản session lazy-create + luồng SSE tới preview.
//
// - Session tạo LẦN dùng đầu: POST /ai/sessions {feature:LESSON_SUGGESTION, contextRef:{lessonId}}.
//   Session cache theo lessonId (ref); đổi lesson → reset (session cũ để nguyên, KHÔNG archive).
// - send(prompt, model?): reset output, mở stream POST /ai/sessions/{id}/messages; accumulate delta.
// - stop(): abort controller → bỏ lượt (BE tự release lock). Giữ phần output đã nhận.
// - error: code SSE/HTTP đã map (component tự đổi ra message localized).

import { useCallback, useEffect, useRef, useState } from "react";
import { createLessonDraftSession } from "../api";
import { streamSse, type SseDone } from "../../../../shared/api/sse";

export interface UseAiDraftStreamReturn {
  /** Đang stream (đã gửi, chưa done/error/stop). */
  streaming: boolean;
  /** Text tích luỹ từ các event delta (markdown thô). */
  output: string;
  /** code lỗi SSE/HTTP gần nhất (null khi không lỗi). */
  error: string | null;
  /** Model thực đã phục vụ lượt gần nhất (từ event done), nếu BE trả. */
  modelUsed: string | null;
  /** Đã có 1 lượt hoàn tất (done) với output — cho phép chèn. */
  hasResult: boolean;
  send: (prompt: string, model?: string) => Promise<void>;
  stop: () => void;
  /** Xoá output + error (bắt đầu lượt mới thủ công / đóng panel). */
  reset: () => void;
}

/**
 * @param lessonId lesson DOCUMENT đang mở. Đổi lessonId → reset session + state.
 */
export function useAiDraftStream(lessonId: string): UseAiDraftStreamReturn {
  const [streaming, setStreaming] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [hasResult, setHasResult] = useState(false);

  const sessionIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const creatingRef = useRef<Promise<string> | null>(null);

  // Đổi lesson: huỷ stream đang chạy + quên session cũ (BE giữ nguyên, không archive).
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    sessionIdRef.current = null;
    creatingRef.current = null;
    setStreaming(false);
    setOutput("");
    setError(null);
    setModelUsed(null);
    setHasResult(false);
  }, [lessonId]);

  const ensureSession = useCallback(async (model?: string): Promise<string> => {
    if (sessionIdRef.current) return sessionIdRef.current;
    if (!creatingRef.current) {
      creatingRef.current = createLessonDraftSession(lessonId, model)
        .then((s) => {
          sessionIdRef.current = s.id;
          return s.id;
        })
        .finally(() => {
          creatingRef.current = null;
        });
    }
    return creatingRef.current;
  }, [lessonId]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  const reset = useCallback(() => {
    setOutput("");
    setError(null);
    setModelUsed(null);
    setHasResult(false);
  }, []);

  const send = useCallback(
    async (prompt: string, model?: string) => {
      if (streaming) return;
      setOutput("");
      setError(null);
      setModelUsed(null);
      setHasResult(false);
      setStreaming(true);

      let sessionId: string;
      try {
        sessionId = await ensureSession(model);
      } catch {
        setError("AI_SESSION_CREATE_FAILED");
        setStreaming(false);
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      let received = false;

      await streamSse(
        `/ai/sessions/${sessionId}/messages`,
        { content: prompt, model: model ?? null },
        {
          onDelta: (text) => {
            received = true;
            setOutput((prev) => prev + text);
          },
          onDone: (data: SseDone) => {
            setModelUsed(data.modelUsed ?? null);
            setStreaming(false);
            setHasResult(received);
            abortRef.current = null;
          },
          onError: (code) => {
            // Session lạ (đã bị dọn) → quên để lần sau tạo mới.
            if (code === "AI_SESSION_NOT_FOUND") sessionIdRef.current = null;
            setError(code);
            setStreaming(false);
            abortRef.current = null;
          },
        },
        controller.signal,
      );

      // streamSse trả về khi abort (stop): đảm bảo cờ streaming tắt (stop() đã tắt, để chắc chắn).
      if (abortRef.current === controller) {
        abortRef.current = null;
        setStreaming(false);
      }
    },
    [streaming, ensureSession],
  );

  return { streaming, output, error, modelUsed, hasResult, send, stop, reset };
}
