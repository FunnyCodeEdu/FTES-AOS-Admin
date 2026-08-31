import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../../shared/api/client";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import { shortVideoKeys } from "./shortvideo.keys";
import { normalizeClipPage } from "./clipPage";
import type {
  Clip,
  ClipListParams,
  ClipListResult,
  CreateClipInput,
  CreateHighlightsInput,
  HighlightJob,
} from "../types";

/**
 * Studio video ngắn qua `apiClient` (baseURL `/api/v1/admin`) — hợp đồng chung đặt REST của
 * module này ở `/api/v1/admin/shortvideo/...`, nên đường dẫn dưới đây là phần đuôi sau `/admin`.
 * Envelope `{code,message,data}` đã được interceptor bóc, `res.data` chính là payload.
 *
 * Cả cụm gác bằng permission `shortvideo.manage` ở BE; FE gate thêm ở route + `<Can>` chỉ để
 * KHÔNG bày ra nút mà người dùng bấm sẽ ăn 403 — không thay được kiểm quyền phía server.
 */

/** FE đếm trang từ 1, BE đếm từ 0 (giống mọi endpoint list khác của repo). */
export function buildClipListQuery(params: ClipListParams) {
  return {
    status: params.status,
    courseId: params.courseId,
    page: Math.max(0, params.page - 1),
    size: params.pageSize,
  };
}

export function useClips(params: ClipListParams) {
  return useQuery<ClipListResult, Error>({
    queryKey: shortVideoKeys.clipList(params),
    queryFn: async () => {
      const res = await apiClient.get("/shortvideo/clips", { params: buildClipListQuery(params) });
      return normalizeClipPage(res.data, params.page, params.pageSize);
    },
    placeholderData: (previous) => previous,
    // Clip mới tạo còn QUEUED/RENDERING ở BE: hỏi lại mỗi 10s CHỈ khi còn việc đang chạy, và
    // không hỏi khi tab ở nền — cùng lối "dừng-khi-terminal" của question-bank / video ingest.
    refetchInterval: (query) =>
      (query.state.data?.items ?? []).some(
        (c) => c.status === "QUEUED" || c.status === "RENDERING"
      )
        ? 10_000
        : false,
    refetchIntervalInBackground: false,
  });
}

/**
 * Nhờ AI đọc transcript và đề xuất các đoạn đáng cắt. BE trả job KÈM suggestions ngay trong
 * response (hợp đồng §3) — nhưng vẫn có thể trả `RUNNING` nếu bên đó chuyển sang chạy nền, nên
 * trang gọi kèm {@link useHighlightJob} để theo dõi tiếp thay vì giả định luôn xong.
 */
export function useCreateHighlights() {
  const qc = useQueryClient();
  return useMutation<HighlightJob, Error, CreateHighlightsInput>({
    mutationFn: async (body) => {
      const res = await apiClient.post<HighlightJob>("/shortvideo/highlights", body);
      return res.data;
    },
    onSuccess: (job) => {
      qc.setQueryData(shortVideoKeys.highlightJob(job.id), job);
    },
    onError: handleAdminMutationError,
  });
}

/** Theo dõi job đang chạy. Chỉ bật khi thật sự còn `RUNNING` — xong là DỪNG hỏi. */
export function useHighlightJob(jobId: string | undefined, enabled: boolean) {
  return useQuery<HighlightJob, Error>({
    queryKey: shortVideoKeys.highlightJob(jobId),
    queryFn: async () => {
      const res = await apiClient.get<HighlightJob>(`/shortvideo/highlights/${jobId}`);
      return res.data;
    },
    enabled: Boolean(jobId) && enabled,
    refetchInterval: (query) => (query.state.data?.status === "RUNNING" ? 5_000 : false),
    refetchIntervalInBackground: false,
    retry: false,
  });
}

function useInvalidateClips() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: shortVideoKeys.clips() });
}

export function useCreateClip() {
  const invalidate = useInvalidateClips();
  return useMutation<Clip, Error, CreateClipInput>({
    mutationFn: async (body) => {
      const res = await apiClient.post<Clip>("/shortvideo/clips", body);
      return res.data;
    },
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}

export function useDeleteClip() {
  const invalidate = useInvalidateClips();
  return useMutation<void, Error, { id: string; reason: string }>({
    // Lý do đi kèm để BE ghi audit — mọi endpoint xoá nguy hiểm của repo này đều đòi `reason`
    // (thiếu → 400 ADMIN_REASON_REQUIRED). DELETE không có body chuẩn nên gửi qua `data` của axios.
    mutationFn: async ({ id, reason }) => {
      await apiClient.delete(`/shortvideo/clips/${id}`, { data: { reason } });
    },
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}

/** Đưa clip lên mục Tin của cộng đồng. BE idempotent theo clipId nên bấm lại không tạo tin trùng. */
export function usePublishClip() {
  const invalidate = useInvalidateClips();
  return useMutation<Clip, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const res = await apiClient.post<Clip>(`/shortvideo/clips/${id}/publish`);
      return res.data;
    },
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}

export function useUnpublishClip() {
  const invalidate = useInvalidateClips();
  return useMutation<Clip, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const res = await apiClient.post<Clip>(`/shortvideo/clips/${id}/unpublish`);
      return res.data;
    },
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}
