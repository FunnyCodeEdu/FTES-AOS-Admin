import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
// Các endpoint dưới /api/v1/resources/* (KHÔNG dưới /admin — admin path thiếu chúng) → coreClient.
// PUT bytes đi tới presigned URL của storage (S3/MinIO): dùng axios TRẦN, tuyệt đối không qua coreClient
// (sẽ nhét Authorization + baseURL /api/v1 làm hỏng chữ ký presigned).

const rawAxios = axios.create();

// Khớp BE ResourceDtos.UploadUrlResponse: { versionId, versionNo, presignedPutUrl, storageKey }.
// KHÔNG có field `url` — đọc `url` sẽ undefined và PUT hỏng.
interface UploadUrlResponse {
  versionId: string;
  versionNo: number;
  presignedPutUrl: string;
  storageKey: string;
}

/** SHA-256 hex của blob (Web Crypto) — BE yêu cầu checksum khi cấp presigned URL. */
async function sha256Hex(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
 * Upload 1 phiên bản mới cho học liệu theo hợp đồng presigned (C-3):
 *   1) POST /resources/{id}/versions/upload-url → { versionId, presignedPutUrl, storageKey }
 *   2) PUT bytes tới `presignedPutUrl` (presigned) — theo dõi tiến trình
 *   3) POST /resources/versions/{versionId}/complete { checksumSha256, sizeBytes }
 */
export function useUploadResourceFile() {
  const queryClientLocal = useQueryClient();
  return useMutation<void, Error, UploadResourceFileVars>({
    mutationFn: async ({ resourceId, file, filename, mimeType, changelog, onProgress }) => {
      const checksumSha256 = await sha256Hex(file);
      const { presignedPutUrl, versionId } = (await coreClient.post(
        `/resources/${resourceId}/versions/upload-url`,
        {
          filename,
          mimeType,
          sizeBytes: file.size,
          checksumSha256,
          ...(changelog ? { changelog } : {}),
        }
      ).then((r) => r.data)) as UploadUrlResponse;

      await rawAxios.put(presignedPutUrl, file, {
        headers: { "Content-Type": mimeType },
        onUploadProgress: (e) => {
          if (onProgress && e.total) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        },
      });

      // BE CompleteUploadRequest yêu cầu { checksumSha256, sizeBytes } và đối chiếu với storage stat
      // + version đã lưu — body rỗng bị @NotBlank/@Positive chặn (400).
      await coreClient.post(`/resources/versions/${versionId}/complete`, {
        checksumSha256,
        sizeBytes: file.size,
      });
    },
    onSuccess: (_data, vars) => {
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.detail(vars.resourceId) });
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.versions(vars.resourceId) });
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.lists() });
    },
  });
}

/** GET /resources/{id}/download-url → URL tải phiên bản hiện tại (C-3). */
export function requestResourceDownloadUrl(resourceId: string): Promise<string> {
  return coreClient
    .get(`/resources/${resourceId}/download-url`)
    .then((r) => (r.data as { url: string }).url);
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
