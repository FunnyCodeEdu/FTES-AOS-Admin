import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../../shared/api/client";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import { exerciseKeys } from "../../exercises/api/exercises.keys";
import { challengeBankKeys } from "./challengeBank.api";
import { buildBankQueryParams, buildReviewQueueParams } from "./bankQuery";
import { buildPaperFilesFormData } from "../paperFile";
import type {
  BankPageResponse,
  BankSearchParams,
  ChallengePaperFileView,
  ChallengePaperInfo,
  ChallengePlacementView,
  ChallengeTagView,
  ReviewQueueParams,
} from "../types";

/**
 * Hooks cho console KHO THỬ THÁCH (change admin-challenge-bank-console).
 *
 * Dùng `apiClient` (base `/api/v1/admin`) — KHÔNG `coreClient` + tiền tố `/admin` như
 * `challengeBank.api.ts` bên cạnh. Hai cách cùng ra một URL; ở đây chọn `apiClient` vì mọi endpoint
 * của console này đều là admin thuần, không có endpoint core nào xen vào.
 *
 * Envelope `{code,message,data}` đã được interceptor bóc ⇒ `res.data` chính là payload.
 */

export const challengeBankConsoleKeys = {
  all: ["admin", "challenge-bank-console"] as const,
  bank: (params: BankSearchParams) =>
    [...challengeBankConsoleKeys.all, "bank", params] as const,
  tagVocab: (q: string) => [...challengeBankConsoleKeys.all, "tag-vocab", q] as const,
  tagsOf: (challengeId: string | undefined) =>
    [...challengeBankConsoleKeys.all, "tags", challengeId] as const,
  placements: (challengeId: string | undefined) =>
    [...challengeBankConsoleKeys.all, "placements", challengeId] as const,
  review: (params: ReviewQueueParams) =>
    [...challengeBankConsoleKeys.all, "review-queue", params] as const,
  paperFiles: (challengeId: string | undefined) =>
    [...challengeBankConsoleKeys.all, "paper-files", challengeId] as const,
};

/**
 * Invalidate sau MỌI mutation ghi của console: cache của chính console + kho-theo-khoá
 * (`challengeBankKeys`) + danh sách challenge per-lesson (`exerciseKeys`). Tag/placement đổi thì tab
 * "Kho challenge" trong trang khoá và panel bài đang mở cũng phải thấy, nếu không hai màn cãi nhau.
 */
function useInvalidateChallengeCaches() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: challengeBankConsoleKeys.all });
    qc.invalidateQueries({ queryKey: challengeBankKeys.all });
    qc.invalidateQueries({ queryKey: exerciseKeys.all });
  };
}

// ------------------------------------------------------------------ kho

/**
 * Kho chung. `courseId` và `subjectId` đều TUỲ CHỌN — đây chính là đường quản đề PE của một môn mà
 * không phải bước vào khoá nào.
 *
 * `retry: false` là CÓ CHỦ ĐÍCH: bỏ trống `courseId` khi thiếu quyền GLOBAL trả 403
 * (`ADMIN_ACCESS_DENIED`) — một câu trả lời dứt khoát của server, thử lại ba lần chỉ làm người dùng
 * chờ lâu hơn để nhận đúng câu đó. Trang bắt `ForbiddenError` và hướng dẫn chọn khoá.
 */
export function useChallengeBank(params: BankSearchParams, enabled = true) {
  return useQuery<BankPageResponse, Error>({
    queryKey: challengeBankConsoleKeys.bank(params),
    enabled,
    retry: false,
    placeholderData: (previous) => previous,
    queryFn: () =>
      apiClient
        .get("/challenges/bank", {
          params: buildBankQueryParams(params),
          // BẮT BUỘC cho `tags`: mặc định axios serialize mảng thành `tags[]=pe&tags[]=mae101`, mà
          // Spring `@RequestParam List<String> tags` chỉ nhận tham số tên ĐÚNG là `tags` — bộ lọc
          // tag sẽ im lặng không có tác dụng (không lỗi, chỉ trả sai kết quả). `indexes: null` cho
          // ra `tags=pe&tags=mae101` (repeated param) đúng thứ BE đọc.
          paramsSerializer: { indexes: null },
        })
        .then((r) => r.data as BankPageResponse),
  });
}

// ------------------------------------------------------------------ tag

/** Từ vựng tag cho typeahead. `q` rỗng ⇒ BE trả đầu danh sách theo slug. */
export function useChallengeTagVocabulary(q: string, limit = 20) {
  return useQuery<ChallengeTagView[], Error>({
    queryKey: challengeBankConsoleKeys.tagVocab(q),
    // Từ vựng tag đổi chậm; giữ 5 phút để gõ typeahead không nện BE mỗi ký tự.
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: () =>
      apiClient
        .get("/challenges/tags", { params: { q: q || undefined, limit } })
        .then((r) => r.data as ChallengeTagView[]),
  });
}

/** Tag hiện tại của 1 challenge. */
export function useChallengeTags(challengeId: string | undefined, enabled = true) {
  return useQuery<ChallengeTagView[], Error>({
    queryKey: challengeBankConsoleKeys.tagsOf(challengeId),
    enabled: enabled && Boolean(challengeId),
    retry: false,
    // Tag là thứ người dùng vừa sửa ở màn khác; đừng phục vụ bản cache cũ khi mở lại trình sửa.
    staleTime: 0,
    queryFn: () =>
      apiClient.get(`/challenges/${challengeId}/tags`).then((r) => r.data as ChallengeTagView[]),
  });
}

/**
 * ĐẶT LẠI toàn bộ tag (replace-set): danh sách gửi lên LÀ trạng thái cuối cùng, tag không có trong
 * danh sách sẽ bị gỡ. BE chuẩn hoá + khử trùng + tự tạo slug mới, trần 32 tag.
 */
export function useSetChallengeTags() {
  const invalidate = useInvalidateChallengeCaches();
  return useMutation<ChallengeTagView[], Error, { id: string; tags: string[] }>({
    mutationFn: ({ id, tags }) =>
      apiClient.put(`/challenges/${id}/tags`, { tags }).then((r) => r.data as ChallengeTagView[]),
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}

// ------------------------------------------------------------ placement

export function useChallengePlacements(challengeId: string | undefined, enabled = true) {
  return useQuery<ChallengePlacementView[], Error>({
    queryKey: challengeBankConsoleKeys.placements(challengeId),
    enabled: enabled && Boolean(challengeId),
    retry: false,
    queryFn: () =>
      apiClient
        .get(`/challenges/${challengeId}/placements`)
        .then((r) => r.data as ChallengePlacementView[]),
  });
}

/**
 * THÊM một chỗ dùng — challenge nằm thêm ở bài này mà KHÔNG rời các bài cũ (khác hẳn
 * `PUT /admin/challenges/{id}/lesson` vốn là CHUYỂN chỗ). Idempotent: thêm lại đúng bài đó trả về
 * placement sẵn có chứ không nhân đôi.
 */
export function useAddChallengePlacement() {
  const invalidate = useInvalidateChallengeCaches();
  return useMutation<ChallengePlacementView, Error, { id: string; lessonId: string }>({
    mutationFn: ({ id, lessonId }) =>
      apiClient
        .post(`/challenges/${id}/placements`, { lessonId })
        .then((r) => r.data as ChallengePlacementView),
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}

/** Gỡ MỘT chỗ dùng; challenge vẫn ở lại kho và ở các chỗ còn lại. */
export function useRemoveChallengePlacement() {
  const invalidate = useInvalidateChallengeCaches();
  return useMutation<void, Error, { id: string; lessonId: string }>({
    mutationFn: ({ id, lessonId }) =>
      apiClient
        .delete(`/challenges/${id}/placements`, { params: { lessonId } })
        .then(() => undefined),
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}

// ---------------------------------------------------------- tạo vào kho

/**
 * Tạo challenge THẲNG VÀO KHO — `POST /api/v1/admin/challenges`, KHÔNG cần khoá/bài nào.
 *
 * Khác `useCreateChallenge` của `exercises.api.ts` (đi `POST /api/v1/challenges`, cần slug/mode/
 * maxSubmissions và không nhận `subjectId`/`difficulty`): đường admin này mới là đường nạp đề của
 * MÔN. BE tự sinh slug từ title, đặt `status = DRAFT`, `mode = INDIVIDUAL`; mốc thời gian bỏ trống
 * nghĩa là "mở ngay / không hạn đóng".
 */
export interface CreateBankChallengeBody {
  title: string;
  description?: string;
  /** EASY | MEDIUM | HARD — giá trị khác bị BE trả 400 CHALLENGE_INVALID_PAYLOAD. */
  difficulty?: string;
  /** CODE (mặc định BE) | MULTIPLE_CHOICE | ESSAY. */
  type?: string;
  subjectId?: string;
  free?: boolean;
  /**
   * Tag gắn NGAY trong lượt tạo (change `challenge-paper-multifile` §4): tạo và gắn tag cùng thành
   * hoặc cùng hỏng, thay vì để lại một thử thách "đã tạo nhưng chưa có tag" khi lệnh thứ hai rơi.
   *
   * ASSUMPTION: BE chưa nhận field này lúc viết (`AdminChallengeController.create` còn đọc
   * `CreateChallengeBody` không có `tags`). Spring/Jackson mặc định BỎ QUA field lạ, nên gửi thừa là
   * vô hại — và `CreateBankChallengeResult.tags` là cách nhận biết BE đã nhận hay chưa (xem
   * `needsTagFollowUp` trong `CreateBankChallengeModal`).
   */
  tags?: string[];
}

/**
 * Kết quả tạo. `id` là hợp đồng hiện tại (`ApiResponse.ok(Map.of("id", id))`); `tags` là phần
 * ADDITIVE của đợt "gắn tag trong lượt tạo" — CÓ MẶT nghĩa là server đã áp tag, VẮNG nghĩa là bản
 * BE đang chạy chưa biết tới `tags` và client phải gọi bù `PUT /{id}/tags`.
 */
export interface CreateBankChallengeResult {
  id: string;
  tags?: ChallengeTagView[] | null;
}

export function useCreateBankChallenge() {
  const invalidate = useInvalidateChallengeCaches();
  return useMutation<CreateBankChallengeResult, Error, CreateBankChallengeBody>({
    mutationFn: (body) =>
      apiClient.post("/challenges", body).then((r) => r.data as CreateBankChallengeResult),
    onSuccess: invalidate,
    // KHÔNG auto-notify: modal tạo tự hiện lỗi inline.
  });
}

/**
 * Sửa META cấp kho của 1 challenge — `PATCH /api/v1/admin/challenges/{id}`, PARTIAL (BE: field null
 * = GIỮ NGUYÊN). Chỉ ba field mà dòng kho THẬT SỰ mang: tiêu đề, độ khó, môn.
 *
 * Cố ý KHÔNG đụng tới description/lịch/maxSubmissions: `/bank` không trả những field đó, nên dựng
 * một form pre-fill cho chúng là bịa số liệu rồi ghi đè dữ liệu thật. Sửa chi tiết vẫn ở
 * `ChallengeEditModal` (nơi có `ChallengeView` đầy đủ).
 */
export interface UpdateBankChallengeBody {
  title?: string;
  difficulty?: string;
  subjectId?: string;
}

export function useUpdateBankChallenge() {
  const invalidate = useInvalidateChallengeCaches();
  return useMutation<void, Error, { id: string; body: UpdateBankChallengeBody }>({
    mutationFn: ({ id, body }) =>
      apiClient.patch(`/challenges/${id}`, body).then(() => undefined),
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}

// ------------------------------------------------------------- đề thi

/**
 * Tải tệp ĐỀ THI lên challenge — `POST /api/v1/admin/challenges/{id}/paper` (multipart `file`).
 *
 * ASSUMPTION: endpoint đang xây song song (path + response đã chốt, chỉ chưa deploy). Đợt mở rộng
 * `admin-challenge-paper-zip-folder` thêm `application/zip` vào tập MIME nhận và đổi trần chung
 * 25 MB thành trần THEO LOẠI (ảnh 25 · PDF 50 · ZIP 50 MB) — hình dạng response KHÔNG đổi.
 *
 * BẪY multipart: default của `apiClient` là `Content-Type: application/json`; không override thì
 * axios `JSON.stringify` FormData và BE nhận rỗng. Truyền `Content-Type: undefined` để browser tự
 * đặt boundary (giống `useUploadBankImages` / `useImportChallengeTestCasesZip`).
 */
export function useUploadChallengePaper() {
  const invalidate = useInvalidateChallengeCaches();
  return useMutation<ChallengePaperInfo, Error, { id: string; file: File }>({
    mutationFn: ({ id, file }) => {
      const form = new FormData();
      form.append("file", file, file.name);
      return apiClient
        .post(`/challenges/${id}/paper`, form, {
          headers: { "Content-Type": undefined },
          // Đề thi tới 50 MB (archive) + BE đóng watermark trước khi trả lời ⇒ dài hơn request
          // thường RẤT nhiều: 50 MB trên đường lên 3 Mbps là ~2,5 phút, timeout 180s cũ sẽ cắt
          // giữa chừng và hiện ra như lỗi mạng trong khi tệp hoàn toàn hợp lệ.
          timeout: 600_000,
        })
        .then((r) => r.data as ChallengePaperInfo);
    },
    onSuccess: invalidate,
    // KHÔNG auto-notify: modal đề thi hiện lỗi inline (kèm gợi ý "endpoint chưa deploy" khi 404).
  });
}

/** Gỡ đề thi khỏi challenge. ASSUMPTION: cùng đợt BE với upload. */
export function useDeleteChallengePaper() {
  const invalidate = useInvalidateChallengeCaches();
  return useMutation<void, Error, { id: string }>({
    mutationFn: ({ id }) => apiClient.delete(`/challenges/${id}/paper`).then(() => undefined),
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}

// --------------------------------------------------- bộ đề NHIỀU TỆP (paper-files)

/**
 * Bộ đề nhiều tệp — change BE `challenge-paper-multifile`.
 *
 * Vì sao cần: một đề PE thật gồm **ảnh/PDF đề** (thí sinh ĐỌC) **kèm template .zip/.docx/.xlsx**
 * (thí sinh TẢI VỀ làm bài). Đường `/paper` một-tệp ở trên chỉ diễn tả được một trong hai, nên lối
 * "chọn cả thư mục" hiện nay phải nén tất cả thành MỘT archive — thí sinh buộc phải tải về + giải
 * nén mới đọc được đề.
 *
 * `role` (VIEW / DOWNLOAD) do SERVER suy từ MIME đã lưu và trả kèm mỗi tệp; FE chỉ hiển thị.
 *
 * ASSUMPTION (endpoint đang xây song song, chưa deploy): 4 route dưới
 * `/api/v1/admin/challenges/{id}/paper-files`. UI phải chịu được 404/405 và rơi về đường `/paper`
 * cũ — `ChallengePaperModal` làm đúng thế.
 *
 * Vẫn dùng `apiClient` (base `/api/v1/admin`) như mọi hook trong file, KHÔNG `coreClient` + tiền tố
 * `/admin`: cùng ra một URL, nhưng trộn hai client cho cùng một tài nguyên trong một file thì lần
 * sửa sau phải đọc cả hai mới biết request thật sự đi đâu.
 */
function useInvalidatePaperFiles() {
  const qc = useQueryClient();
  const invalidateChallenges = useInvalidateChallengeCaches();
  return (challengeId: string) => {
    qc.invalidateQueries({ queryKey: challengeBankConsoleKeys.paperFiles(challengeId) });
    // Bộ đề đổi ⇒ 4 cột `paper_*` (file CHÍNH) của dòng kho cũng đổi theo ở BE — kho/hàng đợi duyệt
    // đang hiển thị chúng phải được làm mới, nếu không hai màn nói hai chuyện khác nhau.
    invalidateChallenges();
  };
}

/** Danh sách tệp của bộ đề, theo thứ tự `sortOrder` server đã sắp. */
export function useChallengePaperFiles(challengeId: string | undefined, enabled = true) {
  return useQuery<ChallengePaperFileView[], Error>({
    queryKey: challengeBankConsoleKeys.paperFiles(challengeId),
    enabled: enabled && Boolean(challengeId),
    // `retry: false` CÓ CHỦ ĐÍCH: endpoint chưa deploy trả 404 — thử lại ba lần chỉ làm modal treo
    // vài giây trước khi rơi về đường `/paper` cũ.
    retry: false,
    // Danh sách vừa bị chính người dùng sửa ở lượt trước; đừng phục vụ bản cache cũ khi mở lại modal.
    staleTime: 0,
    queryFn: () =>
      apiClient
        .get(`/challenges/${challengeId}/paper-files`)
        .then((r) => (r.data as ChallengePaperFileView[] | null) ?? []),
  });
}

/**
 * Tải NHIỀU tệp lên trong MỘT request — multipart với nhiều part cùng tên `files`
 * (`buildPaperFilesFormData`).
 *
 * BẪY multipart: default của `apiClient` là `Content-Type: application/json`; không override thì
 * axios `JSON.stringify` FormData và BE nhận rỗng.
 */
export function useUploadChallengePaperFiles() {
  const invalidate = useInvalidatePaperFiles();
  return useMutation<ChallengePaperFileView[], Error, { id: string; files: File[] }>({
    mutationFn: ({ id, files }) =>
      apiClient
        .post(`/challenges/${id}/paper-files`, buildPaperFilesFormData(files), {
          headers: { "Content-Type": undefined },
          // Cả bộ đề có thể tới 200 MB + BE đóng watermark từng ảnh/PDF trước khi trả lời ⇒ lâu hơn
          // đường một-tệp rất nhiều. Timeout ngắn cắt giữa chừng sẽ hiện ra như lỗi mạng trong khi
          // bộ đề hoàn toàn hợp lệ.
          timeout: 1_800_000,
        })
        .then((r) => (r.data as ChallengePaperFileView[] | null) ?? []),
    onSuccess: (_data, { id }) => invalidate(id),
    // KHÔNG auto-notify: modal đề thi hiện lý do từ chối INLINE, ngay cạnh danh sách tệp đang có —
    // notification bay ra góc rồi biến mất thì admin mất luôn câu giải thích khi đi sửa tệp.
  });
}

/** Gỡ MỘT tệp khỏi bộ đề; các tệp còn lại giữ nguyên thứ tự. */
export function useDeleteChallengePaperFile() {
  const invalidate = useInvalidatePaperFiles();
  return useMutation<void, Error, { id: string; fileId: string }>({
    mutationFn: ({ id, fileId }) =>
      apiClient.delete(`/challenges/${id}/paper-files/${fileId}`).then(() => undefined),
    onSuccess: (_data, { id }) => invalidate(id),
    onError: handleAdminMutationError,
  });
}

/**
 * Sắp lại thứ tự bộ đề — `PUT .../paper-files/order`.
 *
 * ASSUMPTION: body là MẢNG id THUẦN theo thứ tự mới (`["id-2","id-1",…]`), không bọc trong object —
 * đúng hợp đồng đã chốt với lane BE. Thứ tự quan trọng hơn vẻ ngoài: file CHÍNH (4 cột `paper_*`
 * mọi reader cũ đang đọc) được BE suy lại từ đúng thứ tự này.
 */
export function useReorderChallengePaperFiles() {
  const invalidate = useInvalidatePaperFiles();
  return useMutation<ChallengePaperFileView[], Error, { id: string; fileIds: string[] }>({
    mutationFn: ({ id, fileIds }) =>
      apiClient
        .put(`/challenges/${id}/paper-files/order`, fileIds)
        .then((r) => (r.data as ChallengePaperFileView[] | null) ?? []),
    onSuccess: (_data, { id }) => invalidate(id),
    onError: handleAdminMutationError,
  });
}

// --------------------------------------------------------- hàng đợi duyệt

/**
 * Hàng đợi duyệt thử thách — `GET /api/v1/admin/challenges/review-queue`.
 *
 * ASSUMPTION: endpoint đang xây song song. Hợp đồng nói **đã scope sẵn phía server**: người không có
 * phạm vi duyệt nhận TRANG RỖNG chứ không 403. Vì vậy FE KHÔNG lọc lại theo môn/quyền và KHÔNG gate
 * màn hình bằng danh sách permission client-side — làm vậy chỉ giấu mất việc của đúng người được
 * giao (CTV có grant theo SUBJECT chứ không phải leaf global).
 */
export function useChallengeReviewQueue(params: ReviewQueueParams, enabled = true) {
  return useQuery<BankPageResponse, Error>({
    queryKey: challengeBankConsoleKeys.review(params),
    enabled,
    retry: false,
    placeholderData: (previous) => previous,
    queryFn: () =>
      apiClient
        .get("/challenges/review-queue", { params: buildReviewQueueParams(params) })
        .then((r) => r.data as BankPageResponse),
  });
}

export function useApproveChallenge() {
  const invalidate = useInvalidateChallengeCaches();
  return useMutation<void, Error, { id: string }>({
    mutationFn: ({ id }) => apiClient.post(`/challenges/${id}/approve`).then(() => undefined),
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}

/**
 * Từ chối 1 thử thách. `reason` BẮT BUỘC — blank ⇒ BE 400 (`ADMIN_REASON_REQUIRED`). UI đã chặn ba
 * lớp trước đó; đây là lớp cuối.
 */
export function useRejectChallenge() {
  const invalidate = useInvalidateChallengeCaches();
  return useMutation<void, Error, { id: string; reason: string }>({
    mutationFn: ({ id, reason }) =>
      apiClient.post(`/challenges/${id}/reject`, { reason }).then(() => undefined),
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}
