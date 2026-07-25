import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosProgressEvent } from "axios";
import { apiClient, coreClient } from "../../../../shared/api/client";
import { graphqlRequest, toGraphQLSortOrder } from "../../../../shared/api/graphql";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import type {
  PaginatedResponse,
  Resource,
  ResourceDetail,
  ResourceFormValues,
  ResourceListParams,
  ResourceVersion,
  ResourceVisibility,
} from "../../types";
import { resourcesKeys } from "./resources.keys";

const ADMIN_RESOURCES_QUERY = `query AdminResources($filter: AdminResourceFilter, $page: PageInput) {
  adminResources(filter: $filter, page: $page) {
    items {
      id
      title
      type
      status
      subjectId
      visibility
    }
    total
    page
    size
  }
}`;

export function useResources(params: ResourceListParams) {
  return useQuery<PaginatedResponse<Resource>, Error>({
    queryKey: resourcesKeys.list(params),
    queryFn: () =>
      graphqlRequest<{
        adminResources: {
          items: Array<{
            id: string;
            title: string;
            type: string;
            status: string;
            subjectId?: string;
            visibility?: string;
          }>;
          total: number;
          page: number;
          size: number;
        };
      }>(ADMIN_RESOURCES_QUERY, {
        filter: {
          ...(params.search ? { q: params.search } : {}),
          ...(params.status ? { status: params.status } : {}),
          ...(params.subjectId ? { subjectId: params.subjectId } : {}),
          ...(params.type ? { type: params.type } : {}),
          ...(params.sortBy ? { sortBy: params.sortBy } : {}),
          ...(toGraphQLSortOrder(params.sortOrder)
            ? { sortOrder: toGraphQLSortOrder(params.sortOrder) }
            : {}),
        },
        page: { page: Math.max(0, params.page - 1), size: params.pageSize },
      }).then((r) => {
        const now = new Date().toISOString();
        return {
          items: r.adminResources.items.map((item) => ({
            id: item.id,
            subjectId: item.subjectId ?? "",
            subjectName: "",
            title: item.title,
            type: item.type as Resource["type"],
            status: item.status as Resource["status"],
            visibility: (item.visibility ?? "public") as Resource["visibility"],
            license: undefined,
            currentVersion: 0,
            createdBy: "",
            createdAt: now,
            updatedAt: now,
          })),
          total: r.adminResources.total,
          page: (r.adminResources.page ?? 0) + 1,
          pageSize: r.adminResources.size,
        };
      }),
    placeholderData: (previous) => previous,
  });
}

export function useResource(id: string | undefined) {
  return useQuery<ResourceDetail, Error>({
    queryKey: resourcesKeys.detail(id),
    queryFn: () => apiClient.get(`/resources/${id}`).then((r) => r.data as ResourceDetail),
    enabled: !!id,
  });
}

export function useResourceVersions(id: string | undefined) {
  return useQuery<{ items: ResourceVersion[] }, Error>({
    queryKey: resourcesKeys.versions(id),
    queryFn: () =>
      apiClient.get(`/resources/${id}/versions`).then((r) => r.data as { items: ResourceVersion[] }),
    enabled: !!id,
  });
}

export function useReviewQueue(params: ResourceListParams) {
  return useQuery<PaginatedResponse<Resource>, Error>({
    queryKey: resourcesKeys.reviewQueue(params),
    queryFn: () =>
      graphqlRequest<{
        adminResources: {
          items: Array<{
            id: string;
            title: string;
            type: string;
            status: string;
            subjectId?: string;
            visibility?: string;
          }>;
          total: number;
          page: number;
          size: number;
        };
      }>(ADMIN_RESOURCES_QUERY, {
        filter: {
          ...(params.search ? { q: params.search } : {}),
          status: "pending",
          ...(params.subjectId ? { subjectId: params.subjectId } : {}),
          ...(params.type ? { type: params.type } : {}),
          ...(params.sortBy ? { sortBy: params.sortBy } : {}),
          ...(toGraphQLSortOrder(params.sortOrder)
            ? { sortOrder: toGraphQLSortOrder(params.sortOrder) }
            : {}),
        },
        page: { page: Math.max(0, params.page - 1), size: params.pageSize },
      }).then((r) => {
        const now = new Date().toISOString();
        return {
          items: r.adminResources.items.map((item) => ({
            id: item.id,
            subjectId: item.subjectId ?? "",
            subjectName: "",
            title: item.title,
            type: item.type as Resource["type"],
            status: item.status as Resource["status"],
            visibility: (item.visibility ?? "public") as Resource["visibility"],
            license: undefined,
            currentVersion: 0,
            createdBy: "",
            createdAt: now,
            updatedAt: now,
          })),
          total: r.adminResources.total,
          page: (r.adminResources.page ?? 0) + 1,
          pageSize: r.adminResources.size,
        };
      }),
    placeholderData: (previous) => previous,
  });
}

// FE vocab visibility (public/enrolled/package_only) → BE enum Visibility (PUBLIC/MEMBERS/PRIVATE).
// Đảo ngược đúng ánh xạ BE dùng khi trả detail (AdminContentController.resourceVisibility).
const VISIBILITY_TO_BE: Record<ResourceVisibility, "PUBLIC" | "MEMBERS" | "PRIVATE"> = {
  public: "PUBLIC",
  enrolled: "MEMBERS",
  package_only: "PRIVATE",
};

export function useCreateResource() {
  const queryClientLocal = useQueryClient();
  return useMutation<Resource, Error, ResourceFormValues>({
    // C-3: tạo học liệu qua endpoint CÔNG KHAI POST /api/v1/resources (coreClient) — KHÔNG có
    // POST /api/v1/admin/resources. Body map sang CreateResourceRequest: visibility → enum BE,
    // license đã là enum BE (từ Select), subjectId là UUID (SubjectSelect).
    mutationFn: (values) =>
      coreClient
        .post("/resources", {
          title: values.title,
          type: values.type,
          subjectId: values.subjectId,
          visibility: VISIBILITY_TO_BE[values.visibility],
          ...(values.license ? { license: values.license } : {}),
        })
        .then((r) => r.data as Resource),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.lists() });
    },
  });
}

export function useUpdateResource(id: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<ResourceDetail, Error, ResourceFormValues>({
    mutationFn: (values) =>
      // BE là @PatchMapping /admin/resources/{id} (AdminContentController) — PUT trả 405.
      apiClient.patch(`/resources/${id}`, values).then((r) => r.data as ResourceDetail),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.detail(id) });
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.lists() });
    },
  });
}

export function useDeleteResource() {
  const queryClientLocal = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (resourceId) => apiClient.delete(`/resources/${resourceId}`).then(() => undefined),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.lists() });
    },
    onError: handleAdminMutationError,
  });
}

export function useApproveResource() {
  const queryClientLocal = useQueryClient();
  return useMutation<ResourceDetail, Error, { resourceId: string; note?: string }>({
    mutationFn: ({ resourceId, note }) =>
      apiClient.post(`/resources/${resourceId}/approve`, { note }).then((r) => r.data as ResourceDetail),
    onSuccess: (_data, vars) => {
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.detail(vars.resourceId) });
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.lists() });
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.reviewQueue({ page: 1, pageSize: 10 }) });
    },
    onError: handleAdminMutationError,
  });
}

export function useRejectResource() {
  const queryClientLocal = useQueryClient();
  return useMutation<ResourceDetail, Error, { resourceId: string; reason: string }>({
    mutationFn: ({ resourceId, reason }) =>
      apiClient.post(`/resources/${resourceId}/reject`, { reason }).then((r) => r.data as ResourceDetail),
    onSuccess: (_data, vars) => {
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.detail(vars.resourceId) });
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.lists() });
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.reviewQueue({ page: 1, pageSize: 10 }) });
    },
    onError: handleAdminMutationError,
  });
}

// ---------- Upload phiên bản học liệu (C-3) ----------
// Endpoint dưới /api/v1/resources/* (KHÔNG dưới /admin — admin path thiếu chúng) → coreClient.
// Cloudinary upload đi qua BE bằng multipart/form-data (proxy upload): FE gửi thẳng bytes cho BE,
// BE tự tính SHA-256 + đẩy lên Cloudinary. KHÔNG còn presigned PUT / complete client-side.

// Khớp BE ResourceDtos.VersionResponse trả về từ POST /resources/{id}/versions.
interface VersionResponse {
  id: string;
  versionNo: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadStatus: string;
  changelog?: string;
  createdAt: string;
}

export interface UploadResourceFileVars {
  resourceId: string;
  /** File đơn, hoặc Blob application/zip đã nén (type=FE upload cả thư mục). */
  file: Blob;
  filename: string;
  mimeType: string;
  changelog?: string;
  onProgress?: (percent: number) => void;
}

/**
 * Upload 1 phiên bản mới cho học liệu qua endpoint multipart 1 bước (C-3):
 *   POST /resources/{id}/versions  (multipart/form-data; fields: file [+ changelog tuỳ chọn])
 * BE (ResourceService.uploadVersion) kiểm owner-only, tính SHA-256, đẩy Cloudinary rồi trả
 * VersionResponse (uploadStatus="UPLOADED"). BE cap dung lượng = min(cap theo loại, 100MB proxy).
 *
 * QUAN TRỌNG: default của `coreClient` là `Content-Type: application/json` — nếu không override,
 * axios sẽ `JSON.stringify` FormData và BE nhận rỗng. Truyền per-request `Content-Type: undefined`
 * để axios/browser tự đặt `multipart/form-data; boundary=…` (giống questionBank.useUploadBankImages).
 */
export function useUploadResourceFile() {
  const queryClientLocal = useQueryClient();
  return useMutation<VersionResponse, Error, UploadResourceFileVars>({
    mutationFn: async ({ resourceId, file, filename, mimeType, changelog, onProgress }) => {
      const form = new FormData();
      // Bọc blob với đúng filename + mimeType để BE giữ originalFilename và nhận diện loại
      // (Blob nén từ thư mục có thể mất type → ép về mimeType đã suy ra).
      const part = file.type ? file : new Blob([file], { type: mimeType });
      form.append("file", part, filename);
      if (changelog) form.append("changelog", changelog);

      const res = await coreClient.post<VersionResponse>(
        `/resources/${resourceId}/versions`,
        form,
        {
          headers: { "Content-Type": undefined },
          timeout: 120_000,
          onUploadProgress: (event: AxiosProgressEvent) => {
            if (!onProgress) return;
            onProgress(event.total ? Math.round((event.loaded / event.total) * 100) : 0);
          },
        }
      );
      return res.data;
    },
    onSuccess: (_data, vars) => {
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.detail(vars.resourceId) });
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.versions(vars.resourceId) });
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.lists() });
    },
  });
}

/**
 * Tải học liệu QUA BE (`GET /resources/{id}/download`) rồi bung blob — KHÔNG mở URL provider từ
 * `/download-url`: tài khoản Cloudinary chặn delivery `resource_type=raw` nên URL của PDF/zip/slide
 * (phần lớn học liệu) trả 401. Đi qua BE cũng là cách duy nhất gửi được Bearer token — cửa sổ mở
 * bằng `window.open(url)` không đính header nào.
 */
export async function downloadResourceFile(resourceId: string): Promise<void> {
  const res = await coreClient.get(`/resources/${resourceId}/download`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data as Blob);
  window.open(url, "_blank", "noopener");
  // Thu hồi muộn: revoke ngay thì tab vừa mở chưa kịp đọc xong blob.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function useRestoreResourceVersion(id: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<ResourceDetail, Error, number>({
    mutationFn: (version) =>
      apiClient
        .post(`/resources/${id}/versions/${version}/restore`)
        .then((r) => r.data as ResourceDetail),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.detail(id) });
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.versions(id) });
    },
    onError: handleAdminMutationError,
  });
}
