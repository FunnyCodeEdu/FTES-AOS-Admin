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
            visibility: beVisibilityToFe(item.visibility),
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
            visibility: beVisibilityToFe(item.visibility),
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

// FE vocab visibility → BE enum Visibility.
// Contract B: tầng "chỉ người đã mua/ghi danh" là ENUM RIÊNG `ENROLLED_ONLY` (KHÔNG phải MEMBERS —
// MEMBERS = mọi user đăng nhập). BE chọn ENROLLED_ONLY riêng đúng để khớp option `enrolled` của Admin,
// và trả cờ `lockedForViewer` cho item ENROLLED_ONLY mà viewer chưa mua khoá gắn môn.
const VISIBILITY_TO_BE: Record<ResourceVisibility, "PUBLIC" | "ENROLLED_ONLY" | "PRIVATE"> = {
  public: "PUBLIC",
  enrolled: "ENROLLED_ONLY",
  package_only: "PRIVATE",
};

// BE enum Visibility (UPPERCASE .name()) → FE vocab. GraphQL `adminResources` trả visibility THÔ
// (PUBLIC/MEMBERS/PRIVATE/ENROLLED_ONLY) chứ không map như admin REST detail
// (AdminContentController.resourceVisibility) → chuẩn hoá tại đây để list hiển thị nhãn nhất quán với
// detail. ENROLLED_ONLY và MEMBERS (legacy) đều gộp về `enrolled` (khớp mapping detail của BE).
function beVisibilityToFe(raw: string | undefined): ResourceVisibility {
  const v = (raw ?? "").toUpperCase();
  if (v === "PUBLIC") return "public";
  if (v === "PRIVATE" || v === "PACKAGE_ONLY") return "package_only";
  return "enrolled"; // ENROLLED_ONLY, MEMBERS, hoặc đã là "enrolled"
}

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
    mutationFn: async (values) => {
      const { visibility, ...adminFields } = values;
      // Field admin (title/description/tags/status) qua PATCH /admin/resources/{id}
      // (AdminContentController — UpdateResourceBody KHÔNG có visibility).
      const res = await apiClient.patch(`/resources/${id}`, adminFields);
      // Contract B: visibility (vd ENROLLED_ONLY "chỉ người đã mua") SỬA qua PATCH CÔNG KHAI
      // /api/v1/resources/{id} (ResourceController — UpdateResourceRequest CÓ bind visibility). Admin
      // PATCH /admin/resources bỏ qua field lạ nên trước đây đổi visibility khi SỬA là no-op im lặng.
      if (visibility) {
        await coreClient.patch(`/resources/${id}`, { visibility: VISIBILITY_TO_BE[visibility] });
      }
      return res.data as ResourceDetail;
    },
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.detail(id) });
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.lists() });
    },
  });
}

export function useDeleteResource() {
  const queryClientLocal = useQueryClient();
  return useMutation<void, Error, { id: string; reason: string }>({
    // BE gác requireReason → gửi { reason } vào body DELETE (trước gọi rỗng → 400).
    mutationFn: ({ id, reason }) =>
      apiClient.delete(`/resources/${id}`, { data: { reason } }).then(() => undefined),
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

// ---------- Album ảnh học liệu FE (change admin-fe-album-image-upload) ----------
// `type = FE` KHÔNG phải một file zip mà là ALBUM: mỗi ảnh một dòng `resource.fe_images` với
// sortOrder/caption/bình luận riêng. Endpoint nằm ở /api/v1/resources/{id}/images — KHÔNG dưới
// /admin → coreClient (đúng lý do như POST /resources/{id}/versions ở trên).

/** Khớp BE `FeAlbumDtos.FeImageView`. */
export interface FeImageView {
  id: string;
  resourceId: string;
  /**
   * Loại TRANG, không phải loại file. Album FE trộn được hai loại vì đề nạp vào theo ba đường khác
   * nhau (xem `FeUploadMode`): đường ảnh-giữ-nguyên cho ra `IMAGE`, hai đường số hoá cho ra `TEXT`.
   *
   * <p>Trang `TEXT` KHÔNG có `imageUrl` — render nó bằng thẻ ảnh sẽ ra một ô vỡ chứ không ra lỗi,
   * nên mọi chỗ chiếu album PHẢI rẽ nhánh theo trường này. Optional để tương thích bản BE cũ chưa
   * trả trường (khi đó coi như IMAGE, đúng hành vi lúc album chỉ có một loại).
   */
  kind?: "IMAGE" | "TEXT";
  /**
   * Vòng đời của trang: PENDING = worker đang số hoá (chưa có `textContent`); READY = dùng được;
   * FAILED = số hoá hỏng, lý do ở `errorMessage`.
   *
   * <p>Optional để tương thích bản BE cũ chưa trả trường — khi đó coi như READY, đúng hành vi lúc
   * mọi trang đều được tạo xong ngay trong request.
   */
  status?: "PENDING" | "READY" | "FAILED";
  /** Lý do hỏng khi FAILED; khi READY thì là cảnh báo của model (hình cắt trượt…). */
  errorMessage?: string | null;
  /** Nội dung Markdown của trang `TEXT`. Rỗng với trang `IMAGE`. */
  textContent?: string | null;
  imageUrl: string;
  sortOrder: number;
  caption?: string | null;
  uploadedBy?: string | null;
  commentCount: number;
  createdAt: string;
}

/** Khớp BE `FeAlbumDtos.FeAlbumView`. */
export interface FeAlbumView {
  resourceId: string;
  images: FeImageView[];
  total: number;
  /** Trần ảnh của album — SỰ THẬT về trần (200) nằm ở đây, không hardcode ở UI. */
  maxImages: number;
  /**
   * Người đang đăng nhập có được THÊM/XOÁ/SẮP XẾP ảnh không — BE tính bằng ĐÚNG vị từ nó dùng để
   * chặn (`isOwnerOrApprover`). Gate nút bằng cờ này, KHÔNG suy từ permission phía client: quyền
   * duyệt của CTV là grant theo TỪNG MÔN còn client chỉ thấy leaf global.
   */
  canManage: boolean;
}

/** Đọc album (thẳng, không qua cache) — dùng để đối chiếu con trỏ khi nạp tiếp lượt tải dở. */
export async function fetchFeAlbum(resourceId: string): Promise<FeAlbumView> {
  const res = await coreClient.get(`/resources/${resourceId}/images`);
  return res.data as FeAlbumView;
}

/**
 * Album của học liệu, TỰ LÀM MỚI khi còn trang đang số hoá.
 *
 * <p>Số hoá chạy ngầm ở worker nên không có thời điểm nào client "biết" là xong — nó phải hỏi lại.
 * Điều kiện dừng lấy từ chính dữ liệu (`status === "PENDING"`) chứ không từ một bộ đếm ở client:
 * người soạn có thể đóng modal, mở lại, hoặc nạp thêm lô nữa từ một tab khác, và mọi cách đếm ở
 * phía client đều sai trong ít nhất một trong các tình huống đó.
 *
 * <p>5s: đủ nhanh để tiến độ trông sống (mỗi trang ~12s), đủ chậm để một album 200 trang không biến
 * thành một vòng lặp gọi API.
 */
export function useFeAlbum(resourceId: string | undefined, enabled: boolean) {
  return useQuery<FeAlbumView, Error>({
    queryKey: resourcesKeys.feAlbum(resourceId),
    queryFn: () => fetchFeAlbum(resourceId as string),
    enabled: Boolean(resourceId) && enabled,
    staleTime: 0,
    refetchInterval: (query) =>
      (query.state.data?.images ?? []).some((page) => page.status === "PENDING") ? 5_000 : false,
  });
}

export interface UploadFeAlbumImageVars {
  resourceId: string;
  file: File;
  /** MIME khai với BE — BE đối chiếu magic bytes nên phải là kiểu THẬT của ảnh. */
  mimeType: string;
  caption?: string;
  signal?: AbortSignal;
}

/**
 * Nạp MỘT ảnh vào cuối album: `POST /resources/{id}/images` (multipart `file` [+ `caption`]).
 * BE đóng dấu `sortOrder = max+1` → thứ tự gọi hàm này CHÍNH LÀ thứ tự trang của album.
 *
 * Rate limit của BE là 10 ảnh/phút + 60 ảnh/giờ mỗi user → caller PHẢI gọi tuần tự có nhịp
 * (`runFeAlbumUpload` ở `../lib/feAlbumUpload`), đừng `Promise.all`.
 *
 * `Content-Type: undefined` để axios/trình duyệt tự đặt boundary multipart (mặc định của coreClient
 * là application/json → không override thì FormData bị JSON.stringify và BE nhận rỗng).
 */
export async function uploadFeAlbumImage({
  resourceId,
  file,
  mimeType,
  caption,
  signal,
}: UploadFeAlbumImageVars): Promise<FeImageView> {
  const form = new FormData();
  // file.type rỗng (hay gặp trên Windows) → bọc lại Blob đúng MIME đã suy ra, kẻo BE từ chối
  // "Chỉ chấp nhận ảnh png/jpeg/webp" dù nội dung là ảnh thật.
  const part = file.type === mimeType ? file : new Blob([file], { type: mimeType });
  form.append("file", part, file.name);
  if (caption) form.append("caption", caption);

  const res = await coreClient.post<FeImageView>(`/resources/${resourceId}/images`, form, {
    headers: { "Content-Type": undefined },
    timeout: 120_000,
    ...(signal ? { signal } : {}),
  });
  return res.data;
}

// ---------- Đưa học liệu ra mắt (change admin-resource-publish-action) ----------
//
// Vòng đời của BE: DRAFT → (submit) PENDING_APPROVAL → (approve) APPROVED. Chỉ APPROVED mới hiện ra
// cho học viên và cho trang môn — `ResourceService` lọc đúng trạng thái đó. Trước đây Admin chỉ có
// đường duyệt cho học liệu ĐÃ nằm trong hàng chờ (màn Duyệt học liệu), nên một bộ đề vừa nạp xong
// đứng mãi ở DRAFT mà trong màn Học liệu không có cách nào đẩy đi tiếp.
//
// Hai bước gộp làm MỘT hành động "Đưa ra mắt": người soạn có quyền duyệt thì việc bắt họ bấm hai
// nút liên tiếp không thêm một quyết định nào, chỉ thêm một chỗ để bỏ dở giữa chừng.

/** DRAFT/REJECTED → PENDING_APPROVAL. */
export async function submitResource(id: string): Promise<void> {
  await coreClient.post(`/resources/${id}/submit`);
}

/** PENDING_APPROVAL → APPROVED. */
export async function approveResource(id: string): Promise<void> {
  await coreClient.post(`/resources/${id}/approve`);
}

/**
 * Đưa học liệu ra mắt bất kể nó đang ở bước nào.
 *
 * <p>`submit` được bọc try/catch chứ không bỏ qua kết quả: học liệu ĐANG ở PENDING_APPROVAL sẽ bị
 * BE từ chối bước này (sai trạng thái nguồn), và đó là một lỗi VÔ HẠI — bước tiếp theo mới là bước
 * quyết định. Ném nó lên sẽ báo "không đưa ra mắt được" cho một học liệu chỉ việc duyệt là xong.
 */
export function usePublishResource() {
  const queryClientLocal = useQueryClient();
  return useMutation<void, Error, { id: string; status?: string }>({
    mutationFn: async ({ id, status }) => {
      if (status !== "pending") {
        try {
          await submitResource(id);
        } catch {
          // đã nằm trong hàng chờ rồi — đi thẳng sang bước duyệt
        }
      }
      await approveResource(id);
    },
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: resourcesKeys.lists() });
    },
    onError: handleAdminMutationError,
  });
}

// ---------- Hai chế độ nạp đề còn lại (change admin-fe-album-three-modes) ----------
// Album FE nhận đề theo BA đường khác nhau, và người soạn phải CHỌN đúng đường theo dạng bản gốc
// đang có trong tay:
//
//   1. `POST /images`            — ảnh giữ nguyên trang. Dùng khi bản gốc là scan có hình vẽ/chữ
//                                  viết tay mà số hoá sẽ mất mát. Không tìm kiếm được, bot không đọc.
//   2. `POST /image-text-items`  — ảnh ĐƯỢC SỐ HOÁ thành Markdown. Dùng cho đề chụp màn hình/scan
//                                  sạch. Trang tìm kiếm được, copy được, bot giải đề đọc được.
//                                  Ảnh gốc KHÔNG lưu lại.
//   3. `POST /text-items`        — file .txt/.md sẵn có, AI chỉ dọn hình thức.
//
// Hai đường 2 và 3 trả `FeTextImportResult` chứ không phải một dòng album: chúng nhận NHIỀU file
// mỗi lượt và mỗi file có thể hỏng riêng, nên kết quả phải nói được "file nào vào, file nào không
// và vì sao" thay vì ném một lỗi chung cho cả lô.

/** Một file KHÔNG nạp được, kèm lý do đọc được để hiện thẳng lên UI. */
export interface FeTextImportFailure {
  filename: string;
  reason: string;
}

export interface FeTextImportResult {
  created: FeImageView[];
  failed: FeTextImportFailure[];
  warnings: string[];
}

/**
 * Trần SỐ FILE mỗi lượt của đường ảnh→chữ. Sự thật nằm ở BE (`MAX_IMAGE_FILES_PER_REQUEST`).
 *
 * <p>Từng là 3 vì request phải chờ model xong; từ khi BE số hoá NGẦM thì request chỉ ghi trang và
 * cất bytes, nên trần chuyển thành trần DUNG LƯỢNG (20 × 10MB đã vượt trần 100MB của Cloudflare).
 */
export const FE_IMAGE_TEXT_MAX_PER_REQUEST = 20;

/**
 * Nạp ảnh trang đề rồi SỐ HOÁ thành chữ: `POST /resources/{id}/image-text-items`.
 *
 * <p>Tối đa {@link FE_IMAGE_TEXT_MAX_PER_REQUEST} file mỗi lượt và caller phải tự chia lô — trần đó
 * là trần THỜI GIAN, không phải trần chi phí: mỗi ảnh là một lượt gọi model chạy TUẦN TỰ, gom quá
 * tay là chắc chắn ăn timeout ở ingress sau khi vài ảnh đã kịp vào album (nạp lại sẽ nhân đôi chúng).
 *
 * <p>Timeout dài (mỗi ảnh ~35s đo trên apitest, ba ảnh ~110s): đây là đường CHỜ MODEL, không phải
 * đường tải file.
 */
export async function uploadFeImageTextItems({
  resourceId,
  files,
  signal,
}: {
  resourceId: string;
  files: File[];
  signal?: AbortSignal;
}): Promise<FeTextImportResult> {
  const form = new FormData();
  for (const f of files) form.append("files", f, f.name);
  // Timeout ngắn lại: đường này KHÔNG còn chờ model. BE trả về sau khi đã ghi trang PENDING và cất
  // bytes — vài trăm ms. Giữ 300s như cũ nghĩa là một sự cố mạng thật sẽ treo UI 5 phút.
  const res = await coreClient.post<FeTextImportResult>(
    `/resources/${resourceId}/image-text-items`,
    form,
    { headers: { "Content-Type": undefined }, timeout: 60_000, ...(signal ? { signal } : {}) }
  );
  return res.data;
}

/**
 * Nạp đề dạng VĂN BẢN sẵn có (.txt/.md): `POST /resources/{id}/text-items`.
 *
 * <p>Không có trần 3 file như đường ảnh: AI chỉ dọn hình thức trên văn bản đã có nên mỗi file tốn
 * vài giây thay vì vài chục giây.
 */
export async function uploadFeTextItems({
  resourceId,
  files,
  signal,
}: {
  resourceId: string;
  files: File[];
  signal?: AbortSignal;
}): Promise<FeTextImportResult> {
  const form = new FormData();
  for (const f of files) form.append("files", f, f.name);
  const res = await coreClient.post<FeTextImportResult>(`/resources/${resourceId}/text-items`, form, {
    headers: { "Content-Type": undefined },
    timeout: 300_000,
    ...(signal ? { signal } : {}),
  });
  return res.data;
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
