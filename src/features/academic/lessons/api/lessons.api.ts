import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ApiError, ForbiddenError, coreClient } from "../../../../shared/api/client";
import { graphqlRequest } from "../../../../shared/api/graphql";
import { useAuthStore } from "../../../auth/store";
import type {
  CoursePreviewDefault,
  LessonContent,
  LessonPreview,
  LessonStream,
  LessonType,
} from "../types";
import { lessonsKeys } from "./lessons.keys";
import { coursesKeys } from "../../courses/api/courses.keys";

// --- Lesson content ---

interface LessonContentView {
  lessonId: string;
  bodyMd: string | null;
  readingMinutes: number | null;
}

export interface LessonDocument {
  fileName: string;
  mimeType: string;
  storageKey: string;
}

interface AdminLessonContentGql {
  adminLessonContent: {
    id: string;
    name: string;
    description?: string | null;
    type: string;
    free: boolean;
    hasContent: boolean;
    bodyMd: string | null;
    documents: LessonDocument[];
    videoStatus?: string | null;
  } | null;
}

// Đủ field của type AdminLessonContent (schema BE admin-course-management-refinements §2):
// metadata (name/description/type/free) + nội dung đầy đủ (bodyMd KHÔNG teaser, documents,
// videoStatus) + cờ hasContent để drawer phân biệt "chưa có gì" với "có nhưng rỗng phần md".
const ADMIN_LESSON_CONTENT_QUERY = `query AdminLessonContent($lessonId: ID!) {
  adminLessonContent(lessonId: $lessonId) {
    id
    name
    description
    type
    free
    hasContent
    bodyMd
    documents { fileName mimeType storageKey }
    videoStatus
  }
}`;

export interface AdminLessonContentView {
  name: string;
  description?: string | null;
  type: string;
  free: boolean;
  hasContent: boolean;
  bodyMd: string;
  documents: LessonDocument[];
  videoStatus?: string | null;
}

export function useAdminLessonContent(lessonId: string | undefined) {
  return useQuery<AdminLessonContentView, Error>({
    queryKey: lessonsKeys.adminContent(lessonId),
    queryFn: async () => {
      if (!lessonId) throw new Error("Missing lessonId");
      const res = await graphqlRequest<AdminLessonContentGql>(ADMIN_LESSON_CONTENT_QUERY, { lessonId });
      if (!res.adminLessonContent) throw new Error("Không tìm thấy nội dung bài học");
      return {
        name: res.adminLessonContent.name,
        description: res.adminLessonContent.description,
        type: res.adminLessonContent.type,
        free: res.adminLessonContent.free,
        hasContent: res.adminLessonContent.hasContent,
        bodyMd: res.adminLessonContent.bodyMd ?? "",
        documents: res.adminLessonContent.documents ?? [],
        videoStatus: res.adminLessonContent.videoStatus,
      };
    },
    enabled: !!lessonId,
  });
}

export function useLessonContent(lessonId: string | undefined, lessonType?: LessonType) {
  return useQuery<LessonContent, Error>({
    queryKey: lessonsKeys.content(lessonId),
    queryFn: async () => {
      if (!lessonId) throw new Error("Missing lessonId");
      let body = "";
      try {
        const res = await coreClient.get(`/lessons/${lessonId}/content`);
        body = (res.data as LessonContentView | null)?.bodyMd ?? "";
      } catch (error) {
        // Lesson chưa có nội dung → coi như rỗng, không phải lỗi.
        if (!(error instanceof ApiError && error.code === 404)) throw error;
      }
      return {
        lessonId,
        lessonType: lessonType ?? "DOCUMENT",
        body,
        hasContent: body.trim().length > 0,
        updatedAt: new Date().toISOString(),
      };
    },
    enabled: !!lessonId,
  });
}

export function useUpdateLessonContent(lessonId: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<LessonContent, Error, { body: string; lessonType: LessonType }>({
    mutationFn: async (values) => {
      if (!lessonId) throw new Error("Missing lessonId");
      await coreClient.put(`/lessons/${lessonId}/content`, { bodyMd: values.body });
      return {
        lessonId,
        lessonType: values.lessonType,
        body: values.body,
        hasContent: values.body.trim().length > 0,
        updatedAt: new Date().toISOString(),
      };
    },
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: lessonsKeys.content(lessonId) });
    },
  });
}

// --- Lesson metadata (tên / mô tả / loại) ---

/**
 * Sửa metadata bài học: PATCH /api/v1/courses/lessons/{id} (owner-authz requireManage). BE nhận
 * `name`/`description`/`type`/`free` — field vắng = giữ nguyên. Invalidate cả `adminContent`
 * (drawer xem nội dung) lẫn detail khoá (cây bài học) để tên/mô tả mới hiện ngay.
 */
export function useUpdateLessonMeta(lessonId: string | undefined, courseId?: string) {
  const queryClientLocal = useQueryClient();
  return useMutation<
    void,
    Error,
    { name?: string; description?: string; type?: LessonType; free?: boolean }
  >({
    mutationFn: async (values) => {
      if (!lessonId) throw new Error("Missing lessonId");
      await coreClient.patch(`/courses/lessons/${lessonId}`, values);
    },
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: lessonsKeys.adminContent(lessonId) });
      queryClientLocal.invalidateQueries({ queryKey: coursesKeys.detail(courseId) });
      queryClientLocal.invalidateQueries({ queryKey: coursesKeys.managed(courseId) });
    },
  });
}

export interface NewLessonInput {
  sectionId: string;
  name: string;
  description?: string;
  type: LessonType;
  sortOrder: number;
  /** VIDEO: id video upload.ftes.vn hoặc link YouTube. */
  videoRef?: string;
  /** SLIDE / tài liệu: file đính kèm ngay khi tạo. */
  file?: File;
  /** DOCUMENT: nội dung markdown (thường do AI soạn trong popup). */
  bodyMd?: string;
}

/**
 * Tạo bài học + gắn luôn nội dung đi kèm (popup "Bài học mới"). Tạo TRƯỚC (POST
 * /courses/sections/{id}/lessons) rồi mới đính kèm vì video-ref/tài liệu/nội dung đều cần lessonId.
 * Đính kèm lỗi → bài học VẪN tồn tại (admin sửa tiếp ở màn soạn) nên lỗi được ném lại kèm ngữ cảnh,
 * KHÔNG rollback (BE không có transaction xuyên endpoint).
 */
export function useCreateLesson(courseId: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<string, Error, NewLessonInput>({
    mutationFn: async ({ sectionId, videoRef, file, bodyMd, ...body }) => {
      const res = await coreClient.post<{ id: string }>(`/courses/sections/${sectionId}/lessons`, {
        ...body,
        free: false,
      });
      const lessonId = res.data.id;
      if (videoRef?.trim()) {
        await coreClient.put(`/courses/lessons/${lessonId}/video-ref`, {
          videoRef: videoRef.trim(),
        });
      }
      if (file) {
        await postLessonDocument(lessonId, file, file.name);
      }
      if (bodyMd?.trim()) {
        await coreClient.put(`/courses/lessons/${lessonId}/content`, { bodyMd });
      }
      return lessonId;
    },
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: coursesKeys.detail(courseId) });
      queryClientLocal.invalidateQueries({ queryKey: coursesKeys.managed(courseId) });
    },
  });
}

/**
 * Gắn NGUỒN video có sẵn vào bài học: PUT /api/v1/courses/lessons/{id}/video-ref { videoRef }.
 * `videoRef` = id video của upload.ftes.vn (`video_xxx`) hoặc URL YouTube — BE lưu nguyên vào
 * `videos.storage_key` nên stream tự chọn provider (HLS resolve qua upload service / YOUTUBE iframe).
 * Đây cũng là bước chốt của luồng upload file: id do upload service trả về mới là id phát được.
 */
export function useSetLessonVideoRef(lessonId: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<void, Error, { videoRef: string }>({
    mutationFn: async ({ videoRef }) => {
      if (!lessonId) throw new Error("Missing lessonId");
      await coreClient.put(`/courses/lessons/${lessonId}/video-ref`, { videoRef });
    },
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: lessonsKeys.stream(lessonId) });
      queryClientLocal.invalidateQueries({ queryKey: lessonsKeys.preview(lessonId) });
    },
  });
}

// --- Lesson documents / slide ---

export interface LessonDocumentView {
  id: string;
  title: string;
  url: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
}

/** Tài liệu/slide của bài học cho màn soạn — GET .../documents/manage (gate theo ownership). */
export function useLessonDocuments(lessonId: string | undefined) {
  return useQuery<LessonDocumentView[], Error>({
    queryKey: lessonsKeys.documents(lessonId),
    queryFn: async () => {
      if (!lessonId) throw new Error("Missing lessonId");
      const res = await coreClient.get<LessonDocumentView[]>(
        `/courses/lessons/${lessonId}/documents/manage`
      );
      return res.data ?? [];
    },
    enabled: !!lessonId,
  });
}

/**
 * Gửi MỘT tài liệu lên bài học. Hai màn dùng chung một hàm (popup "Bài học mới" và màn soạn bài
 * học) vì phần dễ sai nằm ở cái header bên dưới, và trước đây mỗi màn tự dựng request riêng nên
 * cả hai cùng sai một kiểu.
 *
 * `Content-Type: undefined` là BẮT BUỘC. `coreClient` khai sẵn `application/json` làm mặc định cho
 * mọi request, mà axios gặp `FormData` kèm content-type JSON thì nó ĐỔI FormData THÀNH JSON
 * (`transformRequest`: `hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data`). `File`
 * qua `JSON.stringify` còn lại `{}`, nên server nhận một thân JSON rỗng trong khi endpoint khai
 * `consumes = multipart/form-data` → 415, file không hề rời khỏi trình duyệt. Xoá mặc định đi thì
 * trình duyệt mới tự đặt `multipart/form-data` kèm boundary.
 *
 * Đừng "dọn" tham số header này cho gọn: bỏ nó là tính năng chết ngay, và chết im lặng ở phía
 * người soạn bài.
 */
export async function postLessonDocument(
  lessonId: string,
  file: File,
  title?: string
): Promise<LessonDocumentView> {
  const formData = new FormData();
  formData.append("file", file);
  if (title) formData.append("title", title);
  const res = await coreClient.post<LessonDocumentView>(
    `/courses/lessons/${lessonId}/documents`,
    formData,
    { headers: { "Content-Type": undefined } }
  );
  return res.data;
}

/** Upload slide/tài liệu (multipart) — BE đẩy lên storage rồi lưu URL vào lesson_documents. */
export function useUploadLessonDocument(lessonId: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<LessonDocumentView, Error, { file: File; title?: string }>({
    mutationFn: async ({ file, title }) => {
      if (!lessonId) throw new Error("Missing lessonId");
      return postLessonDocument(lessonId, file, title);
    },
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: lessonsKeys.documents(lessonId) });
    },
  });
}

/**
 * Mở tài liệu: tải QUA BE (`/documents/{id}/download`) rồi bung blob ở tab mới. KHÔNG mở thẳng
 * `doc.url`: đó là URL Cloudinary, file `raw` (pdf/slide/zip) trả 401 vì tài khoản chặn delivery
 * raw. Đi qua BE cũng có nghĩa request mang Bearer token — thẻ <a href> không gửi được header nào.
 */
export async function openLessonDocument(documentId: string): Promise<void> {
  const res = await coreClient.get(`/courses/lessons/documents/${documentId}/download`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(res.data as Blob);
  window.open(url, "_blank", "noopener");
  // Thu hồi muộn: revoke ngay thì tab vừa mở chưa kịp đọc xong blob.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function useDeleteLessonDocument(lessonId: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<void, Error, { documentId: string }>({
    mutationFn: async ({ documentId }) => {
      await coreClient.delete(`/courses/lessons/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: lessonsKeys.documents(lessonId) });
    },
  });
}

// --- Lesson preview (VIDEO) ---

export function useLessonPreview(lessonId: string | undefined, lessonType?: LessonType) {
  return useQuery<LessonPreview, Error>({
    queryKey: lessonsKeys.preview(lessonId),
    queryFn: async () => {
      if (!lessonId) throw new Error("Missing lessonId");
      void lessonType;
      const res = await coreClient.get<LessonPreview>(`/lessons/${lessonId}/preview`);
      return res.data;
    },
    enabled: !!lessonId,
  });
}

export function useUpdateLessonPreview(lessonId: string | undefined, courseId?: string) {
  const queryClientLocal = useQueryClient();
  return useMutation<
    LessonPreview,
    Error,
    { previewSeconds?: number | null; previewPercent?: number | null }
  >({
    mutationFn: async (values) => {
      if (!lessonId) throw new Error("Missing lessonId");
      void courseId;
      const body: { previewSeconds?: number | null; previewPercent?: number | null } = {};
      if (values.previewSeconds !== undefined) body.previewSeconds = values.previewSeconds;
      if (values.previewPercent !== undefined) body.previewPercent = values.previewPercent;
      await coreClient.patch(`/lessons/${lessonId}/preview`, body);
      const res = await coreClient.get<LessonPreview>(`/lessons/${lessonId}/preview`);
      return res.data;
    },
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: lessonsKeys.preview(lessonId) });
    },
  });
}

// --- Lesson stream (video preview) ---

/**
 * Manifest phát video của bài học (GET /courses/lessons/{id}/stream). 403 COURSE_ACCESS_DENIED
 * (viewer ngoài quyền / lesson chưa có video) được xử lý DỊU: trả `null` thay vì ném lỗi → UI hiển
 * thị "chưa có bản xem trước" thay vì màn hình lỗi. Lỗi khác vẫn ném để caller thấy.
 */
export function useLessonStream(lessonId: string | undefined) {
  return useQuery<LessonStream | null, Error>({
    queryKey: lessonsKeys.stream(lessonId),
    queryFn: async () => {
      if (!lessonId) throw new Error("Missing lessonId");
      try {
        const res = await coreClient.get<LessonStream>(`/courses/lessons/${lessonId}/stream`);
        return res.data;
      } catch (error) {
        if (error instanceof ForbiddenError) return null;
        if (error instanceof ApiError && (error.code === 403 || error.code === 404)) return null;
        throw error;
      }
    },
    enabled: !!lessonId,
    // URL ký có TTL → không giữ cache lâu; refetch khi vào lại tab xem trước.
    staleTime: 30 * 1000,
    retry: false,
  });
}

// --- Course preview default ---

export function useCoursePreviewDefault(courseId: string | undefined) {
  return useQuery<CoursePreviewDefault, Error>({
    queryKey: lessonsKeys.coursePreviewDefault(courseId),
    queryFn: async () => {
      if (!courseId) throw new Error("Missing courseId");
      const res = await coreClient.get<CoursePreviewDefault>(`/courses/${courseId}/preview-default`);
      return res.data;
    },
    enabled: !!courseId,
  });
}

export function useUpdateCoursePreviewDefault(courseId: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<
    CoursePreviewDefault,
    Error,
    { defaultPreviewSeconds?: number | null; defaultPreviewPercent?: number | null }
  >({
    mutationFn: async (values) => {
      if (!courseId) throw new Error("Missing courseId");
      const body: { defaultPreviewSeconds?: number | null; defaultPreviewPercent?: number | null } = {};
      if (values.defaultPreviewSeconds !== undefined) body.defaultPreviewSeconds = values.defaultPreviewSeconds;
      if (values.defaultPreviewPercent !== undefined) body.defaultPreviewPercent = values.defaultPreviewPercent;
      await coreClient.patch(`/courses/${courseId}/preview-default`, body);
      const res = await coreClient.get<CoursePreviewDefault>(`/courses/${courseId}/preview-default`);
      return res.data;
    },
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: lessonsKeys.coursePreviewDefault(courseId) });
    },
  });
}

// --- Lesson video upload (BE: course/web/CatalogController) ---
// Contract:
//   POST /api/v1/courses/lessons/{lessonId}/video/upload-url
//     body  { filename, contentType }   (UploadUrlRequest — filename @NotBlank)
//     data  { videoId, url, storageKey } (UploadUrlResponse) — `url` = {uploadBaseUrl}/api/videos
//   POST <url>  (self-hosted upload service upload.ftes.vn, NOT the API) — multipart/form-data:
//     fields: file, videoId (BE id — HLS served at /api/videos/proxy/{videoId}/master.m3u8, so it
//             MUST be sent), title (optional, lesson name), hlsTime='8'.
//     header: Authorization: Bearer <accessToken>. Content-Type is left to the browser (multipart
//             boundary). Response JSON: { videoId, status?, message?, cdnPlaylistUrl? }.
//   POST /api/v1/courses/videos/{videoId}/complete-upload  (no body) — video -> PROCESSING + transcode
// videoStatus surfaces via GET /lessons/{id}/preview (see useLessonPreview): UPLOADING->pending,
// PROCESSING->processing, READY->ready, else error.
// Mirrors Ftes-frontend videoApi.ts#uploadVideoWithProgress, which the BE storage adapter
// (UploadFtesCourseStorageClient) cites as the canonical upload contract.

export interface LessonVideoUploadUrl {
  videoId: string;
  /** BE (UploadUrlResponse) KHÔNG còn trả `url` — giữ optional cho bản cũ, fallback UPLOAD_BASE_URL. */
  url?: string;
  storageKey: string;
}

/**
 * Đích upload video tự host. BE chỉ cấp videoId (không phát URL trung gian), nên admin POST thẳng
 * lên dịch vụ upload — mặc định upload.ftes.vn, đúng host Ftes-frontend dùng (`videoApi.ts`).
 */
export const UPLOAD_BASE_URL =
  (import.meta.env.VITE_UPLOAD_BASE_URL as string | undefined) ?? "https://upload.ftes.vn";

/** Kết quả upload service trả về sau khi nhận video (upload.ftes.vn POST /api/videos). */
export interface UploadVideoResult {
  videoId: string;
  status?: string;
  message?: string;
  cdnPlaylistUrl?: string;
}

/** Step 1 — xin upload URL + videoId cho video của lesson (dùng coreClient: có Bearer + unwrap
 * envelope). `url` BE trả về là `{uploadBaseUrl}/api/videos` — đích của multipart POST ở step 2. */
export function useGetLessonVideoUploadUrl(lessonId: string | undefined) {
  return useMutation<LessonVideoUploadUrl, Error, { filename: string; contentType: string }>({
    mutationFn: async ({ filename, contentType }) => {
      if (!lessonId) throw new Error("Missing lessonId");
      const res = await coreClient.post<LessonVideoUploadUrl>(
        `/courses/lessons/${lessonId}/video/upload-url`,
        { filename, contentType }
      );
      return res.data;
    },
  });
}

/**
 * Step 2 — POST video (multipart/form-data) lên self-hosted upload service (upload.ftes.vn).
 * Dùng axios TRẦN (không phải coreClient): host này KHÔNG phải API chính nên không unwrap envelope.
 * NHƯNG service YÊU CẦU auth → gắn Bearer token thủ công từ auth store (coreClient interceptor
 * không áp cho axios trần). KHÔNG set Content-Type để trình duyệt tự đặt multipart boundary.
 *
 * FormData:
 *   - file:    File video.
 *   - videoId: id BE trả ở step 1 — BE phục vụ HLS tại /api/videos/proxy/{videoId}/master.m3u8
 *              nên BẮT BUỘC gửi để id khớp.
 *   - title:   tên bài học (optional).
 *   - hlsTime: '8' (độ dài segment HLS, giây).
 *
 * Lưu ý CORS: upload.ftes.vn phải cho phép POST từ origin của admin (service tự cấu hình).
 * Timeout 30 phút cho video lớn. Trả về JSON { videoId, status?, message?, cdnPlaylistUrl? }.
 */
export async function postVideoToUploadService(
  url: string,
  file: File,
  videoId: string,
  title?: string,
  onProgress?: (percent: number) => void
): Promise<UploadVideoResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("videoId", videoId);
  if (title) formData.append("title", title);
  formData.append("hlsTime", "8");

  const accessToken = useAuthStore.getState().accessToken;

  const res = await axios.post<UploadVideoResult>(url, formData, {
    // KHÔNG set "Content-Type": trình duyệt tự thêm boundary cho multipart.
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    timeout: 30 * 60 * 1000, // 30 phút — video lớn.
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });
  return res.data;
}

/** Step 3 — đánh dấu upload xong (no body). BE set video PROCESSING + enqueue transcode. */
export function useCompleteLessonVideoUpload() {
  return useMutation<void, Error, { videoId: string }>({
    mutationFn: async ({ videoId }) => {
      await coreClient.post(`/courses/videos/${videoId}/complete-upload`);
    },
  });
}

/**
 * Upload TRỌN 1 file video vào một bài học ĐÃ tồn tại (dùng ở modal TẠO BÀI — sau khi create có
 * lessonId, upload luôn tại chỗ, KHÔNG cần mở màn soạn bài). Gộp đúng 4 bước của
 * LessonVideoUpload.handleFile nhưng gọi coreClient TRỰC TIẾP (không qua hook bind-lessonId, vì
 * lessonId chỉ có sau create): upload-url → POST upload service → complete → set video-ref.
 * Trả videoRef cuối đã gắn. Ném lỗi để caller xử lý (CORS upload.ftes.vn vẫn là ràng buộc hạ tầng).
 */
export async function uploadLessonVideoFile(
  lessonId: string,
  file: File,
  title?: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const { data: init } = await coreClient.post<LessonVideoUploadUrl>(
    `/courses/lessons/${lessonId}/video/upload-url`,
    { filename: file.name, contentType: file.type || "video/mp4" }
  );
  const result = await postVideoToUploadService(
    init.url ?? `${UPLOAD_BASE_URL}/api/videos`,
    file,
    init.videoId,
    title,
    onProgress
  );
  await coreClient.post(`/courses/videos/${init.videoId}/complete-upload`);
  const finalRef =
    result?.videoId && result.videoId !== init.videoId ? result.videoId : init.videoId;
  await coreClient.put(`/courses/lessons/${lessonId}/video-ref`, { videoRef: finalRef });
  return finalRef;
}
