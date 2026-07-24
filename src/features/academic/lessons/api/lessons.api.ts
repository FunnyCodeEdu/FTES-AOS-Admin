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
    { defaultPreviewSeconds?: number; defaultPreviewPercent?: number }
  >({
    mutationFn: async (values) => {
      if (!courseId) throw new Error("Missing courseId");
      const body: { defaultPreviewSeconds?: number; defaultPreviewPercent?: number } = {};
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
  url: string;
  storageKey: string;
}

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
