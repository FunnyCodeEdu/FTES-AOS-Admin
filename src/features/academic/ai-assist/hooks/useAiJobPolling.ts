// Poll hook cho job AI async (teacher/*). Mirror hook cùng tên phía FE learner
// (ai-fe useAiJobPolling) nhưng dựng trên @tanstack/react-query (data layer của admin).
//
// Cadence 2.5s khi còn PENDING/RUNNING; DỪNG ngay khi poll trả status terminal
// (COMPLETED/FAILED/CANCELLED). Cờ isStale bật sau 90s chưa terminal — CHỈ để đổi copy
// ("vẫn đang xử lý…"), KHÔNG dừng poll (BE vẫn có thể xong sau đó).

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { getAiJob } from "../api";
import type { JobView } from "../types";

/** Nhịp poll khi job còn chạy (design §1: ~2.5s). */
export const AI_JOB_POLL_INTERVAL_MS = 2500;

/** Sau mốc này (chưa terminal) thì bật isStale để UI đổi copy — poll KHÔNG dừng. */
export const AI_JOB_STALE_MS = 90_000;

/**
 * Trạng thái terminal (mirror BE AiJobStatus). Poll dừng ở bất kỳ trạng thái nào dưới đây;
 * PENDING/RUNNING giữ poll sống.
 */
export function isTerminalJobStatus(status: string | undefined | null): boolean {
  return status === "COMPLETED" || status === "FAILED" || status === "CANCELLED";
}

/**
 * Quyết định nhịp poll kế tiếp từ status hiện tại (pure — unit test): terminal → `false`
 * (react-query DỪNG refetch), còn lại (PENDING/RUNNING/chưa có data) → giữ nhịp 2.5s.
 */
export function nextPollInterval(status: string | undefined | null): number | false {
  return isTerminalJobStatus(status) ? false : AI_JOB_POLL_INTERVAL_MS;
}

/**
 * Parse JobView.result: JSON-string (tool có cấu trúc) → object; nếu không parse được thì
 * trả nguyên chuỗi (markdown thô). undefined khi chưa có result.
 */
export function parseJobResult<TResult>(raw: string | null | undefined): TResult | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  try {
    return JSON.parse(raw) as TResult;
  } catch {
    return raw as unknown as TResult;
  }
}

export interface UseAiJobPollingReturn<TResult> {
  /** Envelope job mới nhất (undefined trước lần poll đầu). */
  job: JobView | undefined;
  status: JobView["status"] | undefined;
  /** result đã parse khi COMPLETED (JSON→object, else markdown thô). */
  result: TResult | undefined;
  /** Còn PENDING/RUNNING (poll đang chạy). */
  isRunning: boolean;
  isComplete: boolean;
  /** FAILED hoặc CANCELLED. */
  isFailed: boolean;
  /** Đã quá AI_JOB_STALE_MS mà chưa terminal (chỉ đổi copy). */
  isStale: boolean;
  /** Lỗi fetch/mạng khi poll (KHÁC job status FAILED). */
  error: Error | null;
  isLoading: boolean;
  /** Poll lại ngay (retry thủ công). */
  refresh: () => void;
}

/**
 * Poll GET /ai/jobs/{id} cho tới khi terminal. Truyền jobId từ submit (JobRef.jobId nhờ
 * envelope 1002). null/undefined = chưa submit → không gọi request.
 */
export function useAiJobPolling<TResult = unknown>(
  jobId: string | null | undefined,
): UseAiJobPollingReturn<TResult> {
  const query = useQuery<JobView, Error>({
    queryKey: ["ai", "job", jobId],
    queryFn: () => getAiJob(jobId as string),
    enabled: !!jobId,
    // Nhịp động: poll khi còn chạy, trả false (dừng) ngay khi 1 lần poll ra terminal.
    refetchInterval: (q) => nextPollInterval(q.state.data?.status),
    refetchIntervalInBackground: false,
    // Job là snapshot 1 lần dùng: không giữ cache cũ khi đổi jobId.
    gcTime: 0,
  });

  const status = query.data?.status;
  const isComplete = status === "COMPLETED";
  const isFailed = status === "FAILED" || status === "CANCELLED";
  const isRunning = jobId != null && !isTerminalJobStatus(status);

  // Đồng hồ stale: đặt timeout 90s mỗi khi job (mới) bắt đầu chạy; clear khi terminal,
  // đổi jobId, hoặc unmount. Key theo jobId để đổi job reset đồng hồ.
  const [isStale, setIsStale] = useState(false);
  const jobIdRef = useRef(jobId);
  if (jobIdRef.current !== jobId) {
    // Reset đồng bộ khi đổi job để cờ stale của job cũ không rớt sang render đầu của job mới.
    jobIdRef.current = jobId;
    if (isStale) setIsStale(false);
  }
  useEffect(() => {
    if (!jobId) return;
    if (isTerminalJobStatus(status)) return;
    const timer = setTimeout(() => setIsStale(true), AI_JOB_STALE_MS);
    return () => clearTimeout(timer);
  }, [jobId, status]);

  const result = useMemo(
    () => (isComplete ? parseJobResult<TResult>(query.data?.result) : undefined),
    [isComplete, query.data?.result],
  );

  return {
    job: query.data,
    status,
    result,
    isRunning,
    isComplete,
    isFailed,
    isStale: isStale && !isTerminalJobStatus(status),
    error: query.error,
    isLoading: query.isLoading && !!jobId,
    refresh: () => {
      void query.refetch();
    },
  };
}
