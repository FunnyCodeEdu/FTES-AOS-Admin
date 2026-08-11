import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, coreClient } from "../../../../shared/api/client";
import { adminErrorMessage, handleAdminMutationError } from "../../../../shared/api/errors";
import { resourcesKeys } from "../../resources/api/resources.keys";
import type {
  BulkApproveResult,
  FeAlbumView,
  ModerationQueueParams,
  PendingResourceSummary,
  ResourceDetail,
  ResourcePageResponse,
  ResourceVersion,
} from "../../types";
import { resourceModerationKeys } from "./moderation.keys";

/**
 * Hàng đợi duyệt học liệu — `GET /api/v1/resources/moderation/pending`.
 *
 * Dùng `coreClient` (base `/api/v1`) chứ KHÔNG phải `apiClient`: endpoint này thuộc
 * `ResourceController`, KHÔNG nằm dưới `/api/v1/admin`. Gọi bằng `apiClient` sẽ ra
 * `/api/v1/admin/resources/moderation/pending` → 404.
 *
 * Scope do BE quyết (`ResourceService.moderationQueue` lọc theo `identity.approvableSubjectIds()`:
 * null = duyệt toàn cục → thấy tất; set rỗng → trang RỖNG chứ không 403; set có id → chỉ môn đó).
 * FE TUYỆT ĐỐI không lọc lại theo môn — làm vậy chỉ giấu bớt thứ BE đã cho phép thấy.
 *
 * `page` của BE là **0-based**; params ở FE là 1-based (vocab AntD) nên trừ 1 tại đây.
 */
export function useModerationQueue(params: ModerationQueueParams) {
  return useQuery<ResourcePageResponse<PendingResourceSummary>, Error>({
    queryKey: resourceModerationKeys.queue(params),
    queryFn: () =>
      coreClient
        .get("/resources/moderation/pending", {
          params: { page: Math.max(0, params.page - 1), size: params.pageSize },
        })
        .then((r) => r.data as ResourcePageResponse<PendingResourceSummary>),
    // Giữ trang cũ trong lúc fetch trang mới → bảng không nhấp nháy về trạng thái rỗng.
    placeholderData: (previous) => previous,
  });
}

/**
 * Metadata đầy đủ của một mục trong hàng đợi — `GET /api/v1/admin/resources/{id}`
 * (`apiClient`, gác `admin.resource.read`). Đây là nguồn DUY NHẤT cho `createdBy` (người gửi),
 * `subjectName`, `currentVersion` và `rejectReason` — payload hàng đợi không mang các field đó.
 */
export function useModerationResourceDetail(id: string | undefined) {
  return useQuery<ResourceDetail, Error>({
    queryKey: resourceModerationKeys.detail(id),
    queryFn: () => apiClient.get(`/resources/${id}`).then((r) => r.data as ResourceDetail),
    enabled: !!id,
    retry: false,
  });
}

/**
 * Lịch sử phiên bản — `GET /api/v1/admin/resources/{id}/versions` (`apiClient`, `admin.resource.read`).
 * Dùng làm "preview" cho học liệu KHÔNG phải album FE: biết có mấy bản, bản mới nhất upload xong
 * chưa, ai đẩy lên lúc nào — đủ để quyết định duyệt mà không phải tải file về.
 */
export function useModerationResourceVersions(id: string | undefined, enabled = true) {
  return useQuery<{ items: ResourceVersion[] }, Error>({
    queryKey: resourceModerationKeys.versions(id),
    queryFn: () =>
      apiClient.get(`/resources/${id}/versions`).then((r) => r.data as { items: ResourceVersion[] }),
    enabled: !!id && enabled,
    retry: false,
  });
}

/**
 * Album ảnh đề FE — `GET /api/v1/resources/{id}/images` (`FeAlbumController`).
 * `coreClient` vì endpoint KHÔNG dưới `/admin`; không có bản admin nào của album.
 */
export function useFeAlbum(id: string | undefined, enabled = true) {
  return useQuery<FeAlbumView, Error>({
    queryKey: resourceModerationKeys.album(id),
    queryFn: () => coreClient.get(`/resources/${id}/images`).then((r) => r.data as FeAlbumView),
    enabled: !!id && enabled,
    retry: false,
  });
}

// ---------- Lệnh duyệt / từ chối ----------
// Đi đường ADMIN (`apiClient`) chứ không phải `POST /api/v1/resources/{id}/approve` công khai:
// CHỈ nhánh admin ghi audit (`AdminContentController` gọi `audit.record(actor,"resource.approve",…)`
// rồi `markRecorded`). Quyết định duyệt là hành động nguy hiểm theo CLAUDE.md → bắt buộc audit.

/**
 * Duyệt 1 học liệu. BE `approveResource` KHÔNG khai `@RequestBody` → gửi body là no-op im lặng,
 * nên tuyệt đối không thêm `{note}` ở đây (code cũ trong `resources.api.ts` có gửi — bị BE bỏ qua).
 * Response là `ApiResponse<Void>` ⇒ `res.data === null`; đừng ép kiểu thành ResourceDetail.
 */
export function approveResourceRequest(id: string): Promise<void> {
  return apiClient.post(`/resources/${id}/approve`).then(() => undefined);
}

/**
 * Từ chối 1 học liệu. `reason` BẮT BUỘC — BE `helper.requireReason` ném 400
 * `ADMIN_REASON_REQUIRED` khi null/blank. UI đã chặn từ trước; đây là lớp cuối cùng.
 */
export function rejectResourceRequest(id: string, reason: string): Promise<void> {
  return apiClient.post(`/resources/${id}/reject`, { reason }).then(() => undefined);
}

/**
 * Invalidate sau mỗi quyết định: hàng đợi (mục vừa xử phải biến mất) VÀ cache của feature
 * `resources` (bảng học liệu + trang detail đang hiển thị status cũ). Không optimistic update —
 * chỉ invalidate rồi refetch, để trạng thái hiển thị luôn là thứ BE thật sự có.
 */
function useInvalidateAfterDecision() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: resourceModerationKeys.all });
    queryClient.invalidateQueries({ queryKey: resourcesKeys.all });
  };
}

export function useApproveResource() {
  const invalidate = useInvalidateAfterDecision();
  return useMutation<void, Error, { id: string }>({
    mutationFn: ({ id }) => approveResourceRequest(id),
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}

export function useRejectResource() {
  const invalidate = useInvalidateAfterDecision();
  return useMutation<void, Error, { id: string; reason: string }>({
    mutationFn: ({ id, reason }) => rejectResourceRequest(id, reason),
    onSuccess: invalidate,
    onError: handleAdminMutationError,
  });
}

/**
 * Duyệt hàng loạt. Gọi HÀM TRẦN `approveResourceRequest` trong `Promise.allSettled` — cố ý KHÔNG
 * dùng `useApproveResource().mutateAsync`, vì hook đó gắn `onError: handleAdminMutationError` nên
 * 10 mục hỏng sẽ bắn 10 notification chồng nhau mà vẫn không nói rõ mục NÀO hỏng.
 *
 * Mutation này KHÔNG bao giờ reject: nó luôn resolve về `{succeeded, failed[]}` để caller mở
 * `BulkApproveResultModal` — thành công một phần phải nhìn ra được là một phần, không được trông
 * giống thành công toàn bộ.
 */
export function useBulkApproveResources() {
  const invalidate = useInvalidateAfterDecision();
  return useMutation<BulkApproveResult, Error, { items: Array<{ id: string; title: string }> }>({
    mutationFn: async ({ items }) => {
      const settled = await Promise.allSettled(
        items.map((item) => approveResourceRequest(item.id))
      );
      const result: BulkApproveResult = { succeeded: [], failed: [] };
      settled.forEach((outcome, index) => {
        const item = items[index];
        if (outcome.status === "fulfilled") {
          result.succeeded.push(item.id);
        } else {
          result.failed.push({
            id: item.id,
            title: item.title,
            message: adminErrorMessage(outcome.reason),
          });
        }
      });
      return result;
    },
    // Chạy cả khi có mục hỏng: mục THÀNH CÔNG đã đổi trạng thái thật, hàng đợi phải phản ánh.
    onSettled: invalidate,
  });
}
