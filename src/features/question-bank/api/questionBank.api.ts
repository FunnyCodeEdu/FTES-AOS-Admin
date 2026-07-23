import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosProgressEvent } from "axios";
import { coreClient } from "../../../shared/api/client";
import { handleAdminMutationError } from "../../../shared/api/errors";
import { questionBankKeys } from "./questionBank.keys";
import { QUESTION_ITEM_POLL_INTERVAL_MS, hasPendingItems } from "../format";
import type {
  CreateBankInput,
  QuestionBankDetail,
  QuestionBankView,
  QuestionItemView,
} from "../types";

/**
 * Kho câu hỏi qua `coreClient` (`/api/v1/question-banks`, KHÔNG `apiClient` `/api/v1/admin`).
 * Envelope `{code,message,data}` đã được interceptor bóc nên `res.data` chính là payload;
 * `isEnvelopeSuccess` coi `1002` ("Accepted") là success nên POST giải-async trả job envelope
 * vẫn qua bình thường.
 */

/** Danh sách kho caller quản lý (owner-scoped). Lọc/tìm client-side (BE không doc paging). */
export function useQuestionBanks() {
  return useQuery<QuestionBankView[], Error>({
    queryKey: questionBankKeys.lists(),
    queryFn: async () => {
      const res = await coreClient.get<QuestionBankView[]>("/question-banks");
      return res.data;
    },
    placeholderData: (previous) => previous,
  });
}

/**
 * Chi tiết kho + danh sách item. Poll khi còn item PENDING: `refetchInterval` trả 3s khi còn
 * PENDING, `false` (DỪNG) khi mọi item terminal — shape "dừng-khi-terminal" như
 * `notifications.useRunningTasks` / `useAiJobPolling.nextPollInterval`. Không poll ở background.
 */
export function useQuestionBankDetail(bankId: string | undefined) {
  return useQuery<QuestionBankDetail, Error>({
    queryKey: questionBankKeys.detail(bankId),
    queryFn: async () => {
      const res = await coreClient.get<QuestionBankDetail>(`/question-banks/${bankId}`);
      return res.data;
    },
    enabled: !!bankId,
    refetchInterval: (query) =>
      hasPendingItems(query.state.data?.items) ? QUESTION_ITEM_POLL_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
  });
}

/** Invalidate cả detail của kho lẫn danh sách sau mỗi mutation ghi. */
function useInvalidateBank(bankId: string | undefined) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: questionBankKeys.lists() });
    if (bankId) qc.invalidateQueries({ queryKey: questionBankKeys.detail(bankId) });
  };
}

export function useCreateQuestionBank() {
  const qc = useQueryClient();
  return useMutation<QuestionBankView, Error, CreateBankInput>({
    mutationFn: async (body) => {
      const res = await coreClient.post<QuestionBankView>("/question-banks", body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: questionBankKeys.lists() });
    },
    onError: handleAdminMutationError,
  });
}

/**
 * Tải lô ảnh (multipart). ĐIỂM QUAN TRỌNG NHẤT: default của `coreClient` là
 * `Content-Type: application/json` — nếu không override, axios sẽ `JSON.stringify` FormData
 * (transformRequest thấy application/json) và BE nhận rỗng. Truyền per-request
 * `Content-Type: undefined` để axios/browser tự đặt `multipart/form-data; boundary=…`.
 * Kèm `timeout` ~120s (nén + Cloudinary một lô ~50 ảnh) và `onUploadProgress` cho thanh tiến trình.
 */
export function useUploadBankImages(
  bankId: string | undefined,
  onProgress?: (percent: number) => void
) {
  const invalidate = useInvalidateBank(bankId);
  return useMutation<QuestionItemView[], Error, File[]>({
    mutationFn: async (files) => {
      const form = new FormData();
      for (const file of files) {
        form.append("files", file, file.name);
      }
      const res = await coreClient.post<QuestionItemView[]>(
        `/question-banks/${bankId}/images`,
        form,
        {
          headers: { "Content-Type": undefined },
          timeout: 120_000,
          onUploadProgress: (event: AxiosProgressEvent) => {
            if (!onProgress) return;
            const percent = event.total
              ? Math.round((event.loaded / event.total) * 100)
              : 0;
            onProgress(percent);
          },
        }
      );
      return res.data;
    },
    // onSettled (không chỉ onSuccess): batch upload có thể fail SAU khi BE đã tạo một phần item →
    // refetch detail để hiện các item đã tạo dở, tránh UI lệch với server.
    onSuccess: invalidate,
    onSettled: invalidate,
    onError: handleAdminMutationError,
  });
}

/** Giải lại một item (re-run AI). Item quay về PENDING → poll fold lại. */
export function useResolveItem(bankId: string | undefined) {
  const invalidate = useInvalidateBank(bankId);
  return useMutation<QuestionItemView, Error, { itemId: string }>({
    mutationFn: async ({ itemId }) => {
      const res = await coreClient.post<QuestionItemView>(
        `/question-banks/${bankId}/items/${itemId}/resolve`
      );
      return res.data;
    },
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}

export function useDeleteBank() {
  const qc = useQueryClient();
  return useMutation<void, Error, { bankId: string }>({
    mutationFn: async ({ bankId }) => {
      await coreClient.delete(`/question-banks/${bankId}`);
    },
    onSuccess: (_data, { bankId }) => {
      qc.invalidateQueries({ queryKey: questionBankKeys.lists() });
      qc.invalidateQueries({ queryKey: questionBankKeys.detail(bankId) });
    },
    onError: handleAdminMutationError,
  });
}

export function useDeleteItem(bankId: string | undefined) {
  const invalidate = useInvalidateBank(bankId);
  return useMutation<void, Error, { itemId: string }>({
    mutationFn: async ({ itemId }) => {
      await coreClient.delete(`/question-banks/${bankId}/items/${itemId}`);
    },
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}
