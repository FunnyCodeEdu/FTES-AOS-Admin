// Lesson content / preview types. API shape is assumed by design.md.

export type LessonType = "DOCUMENT" | "VIDEO" | "QUIZ" | "ASSIGNMENT";

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
  previewSeconds?: number; // legacy default (15:00)
  previewPercent?: number; // percent default; 0 = off
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
