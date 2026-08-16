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
 * Trần dung lượng MỘT request tải ảnh, tính theo tổng bytes của các file trong lô.
 *
 * Vì sao 60MB chứ không phải 90MB (trần backend) hay 100MB (trần Cloudflare):
 *  - Cloudflare chặn cứng ở 100MB và trả HTML 413 THÔ — không phải envelope JSON — nên FE không
 *    đọc được lý do và chỉ hiện được "N ảnh thất bại" trống rỗng. Phải tránh chạm vào nó.
 *  - Backend chặn ở 90MB (`QUESTIONBANK_BATCH_TOO_LARGE`).
 *  - multipart còn cộng thêm boundary + header cho mỗi file, nên tổng bytes trên dây LỚN HƠN tổng
 *    kích thước file. 60MB để lại khoảng đệm rộng cho phần phụ trội đó.
 *
 * Nén WebP chạy Ở SERVER (ImageOptimizer), tức là SAU khi request đã phải vượt Cloudflare — nó
 * không giúp gì cho giới hạn này.
 */
const MAX_BATCH_BYTES = 60 * 1024 * 1024;

/** Trần số file mỗi request, khớp `ftes.questionbank.max-files-per-batch` của backend. */
const MAX_BATCH_FILES = 50;

/** Chia danh sách file thành các lô vừa dưới CẢ hai trần: tổng bytes và số lượng. */
export function splitIntoBatches(
  files: File[],
  maxBytes = MAX_BATCH_BYTES,
  maxFiles = MAX_BATCH_FILES
): File[][] {
  const batches: File[][] = [];
  let current: File[] = [];
  let currentBytes = 0;
  for (const file of files) {
    // Một file đơn lẻ vượt trần vẫn được gửi RIÊNG thành một lô: để backend trả lỗi nghiệp vụ nói
    // rõ file nào quá lớn, thay vì FE âm thầm bỏ qua nó.
    const wouldExceed =
      current.length > 0 &&
      (currentBytes + file.size > maxBytes || current.length >= maxFiles);
    if (wouldExceed) {
      batches.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(file);
    currentBytes += file.size;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

/** Lỗi của MỘT lô, giữ lại tên file để báo chính xác cái nào chưa lên. */
export class BatchUploadError extends Error {
  constructor(
    message: string,
    readonly uploaded: QuestionItemView[],
    readonly failedFiles: string[]
  ) {
    super(message);
    this.name = "BatchUploadError";
  }
}

/**
 * Tải ảnh theo NHIỀU lô tuần tự.
 *
 * <p>ĐIỂM QUAN TRỌNG NHẤT khi gửi multipart: default của `coreClient` là
 * `Content-Type: application/json` — nếu không override, axios sẽ `JSON.stringify` FormData
 * (transformRequest thấy application/json) và BE nhận rỗng. Truyền per-request
 * `Content-Type: undefined` để axios/browser tự đặt `multipart/form-data; boundary=…`.
 *
 * <p>Vì sao TUẦN TỰ chứ không song song: gửi song song nhân băng thông lên và nhiều lô có thể cùng
 * lúc đang bay, nên tổng dữ liệu trên dây vẫn vượt trần — đúng thứ việc chia lô nhằm tránh. Tuần tự
 * cũng cho thanh tiến trình một con số có nghĩa.
 *
 * <p>Vì sao DỪNG ở lô hỏng đầu tiên: các lô sau nhiều khả năng hỏng cùng lý do (mạng, hết hạn
 * token, hết quyền). Cứ chạy tiếp là bắt người dùng chờ hết toàn bộ rồi mới báo lỗi. Ảnh của những
 * lô đã xong VẪN được giữ — backend đã tạo item thật — nên thông báo phải nói rõ đã lên bao nhiêu
 * và còn lại những file nào.
 */
export function useUploadBankImages(
  bankId: string | undefined,
  onProgress?: (percent: number) => void
) {
  const invalidate = useInvalidateBank(bankId);
  return useMutation<QuestionItemView[], Error, File[]>({
    mutationFn: async (files) => {
      const batches = splitIntoBatches(files);
      const totalBytes = files.reduce((sum, f) => sum + f.size, 0) || 1;
      const uploaded: QuestionItemView[] = [];
      let sentBytes = 0;

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const form = new FormData();
        for (const file of batch) {
          form.append("files", file, file.name);
        }
        const batchBytes = batch.reduce((sum, f) => sum + f.size, 0);
        try {
          const res = await coreClient.post<QuestionItemView[]>(
            `/question-banks/${bankId}/images`,
            form,
            {
              headers: { "Content-Type": undefined },
              // Timeout theo TỪNG lô, không phải cả lượt: một lô ~60MB gồm tải lên + nén WebP +
              // đẩy lên object storage ở phía server.
              timeout: 180_000,
              onUploadProgress: (event: AxiosProgressEvent) => {
                if (!onProgress) return;
                // Tiến trình tính trên TỔNG số bytes của mọi lô, nếu không thanh sẽ nhảy về 0 mỗi
                // lần sang lô mới và trông như đang chạy lại từ đầu.
                const percent = Math.round(
                  ((sentBytes + event.loaded) / totalBytes) * 100
                );
                onProgress(Math.min(99, percent));
              },
            }
          );
          uploaded.push(...res.data);
          sentBytes += batchBytes;
        } catch (err) {
          // Còn lại = lô đang hỏng CỘNG mọi lô sau nó. Tính từ chỉ số lô, không dò theo tên file:
          // hai ảnh trùng tên là chuyện thường khi kéo-thả cả thư mục.
          const remaining = batches.slice(i).flat().map((f) => f.name);
          const reason = err instanceof Error ? err.message : String(err);
          throw new BatchUploadError(
            uploaded.length > 0
              ? `Đã tải lên ${uploaded.length} ảnh, dừng ở lô kế tiếp: ${reason}`
              : reason,
            uploaded,
            remaining
          );
        }
      }
      onProgress?.(100);
      return uploaded;
    },
    // onSettled (không chỉ onSuccess): lô sau có thể hỏng SAU khi các lô trước đã tạo item →
    // refetch detail để hiện đúng những gì server đang có, tránh UI lệch.
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
