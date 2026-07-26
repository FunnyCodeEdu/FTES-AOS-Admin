// Lesson content / preview types. API shape is assumed by design.md.

export type LessonType = "DOCUMENT" | "VIDEO" | "SLIDE" | "QUIZ" | "ASSIGNMENT";

/** Loại bài học BE chấp nhận khi tạo/sửa (CatalogService.createLesson). */
export const LESSON_TYPES = ["VIDEO", "SLIDE", "DOCUMENT"] as const;

export interface LessonContent {
  lessonId: string;
  lessonType: LessonType;
  body: string;
  hasContent: boolean;
  updatedAt: string;
}

export interface LessonPreview {
  lessonId: string;
  lessonType: LessonType;
  previewSeconds: number | null; // null = inherit course default
  previewPercent?: number | null; // null = inherit course default; 0 = off
  effectivePreviewSeconds: number;
  effectivePreviewPercent?: number;
  videoDurationSeconds?: number;
  videoStatus?: "pending" | "processing" | "ready" | "error";
}

export interface CoursePreviewDefault {
  courseId: string;
  // BE serializes these exact keys (CourseDtos.CoursePreviewDefault): previewSeconds (int, system
  // default 900) + defaultPreviewPercent (nullable). Do NOT rename to previewPercent — that key never
  // exists on the wire so the saved document percent would never re-hydrate.
  previewSeconds?: number; // default preview window in seconds (0 = off)
  defaultPreviewPercent?: number; // default preview percent (0 = off)
}

/**
 * Manifest phát video của bài học — BE `StreamViewResponse` (GET /courses/lessons/{id}/stream,
 * course-freemium-preview). `provider` quyết định cách render: HLS (dùng hls.js với `url`) hoặc
 * YOUTUBE (nhúng iframe theo `videoRef`; `url` null). `enforceClientGate` = server không cắt được
 * (YouTube) nên client tự gate theo `previewSeconds`. NONE → BE 403 (không trả record này).
 */
export interface LessonStream {
  url: string | null;
  ttlSeconds: number;
  mode: string;
  previewSeconds: number;
  provider: "HLS" | "YOUTUBE" | string;
  videoRef: string | null;
  enforceClientGate: boolean;
}

export interface LessonRow {
  id: string;
  courseId: string;
  title: string;
  type: LessonType;
  hasContent?: boolean;
  previewSeconds: number | null;
  effectivePreviewSeconds: number;
  videoDurationSeconds?: number;
}
