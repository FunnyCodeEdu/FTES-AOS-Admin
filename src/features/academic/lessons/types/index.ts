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
  effectivePreviewSeconds: number;
  videoDurationSeconds?: number;
  videoStatus?: "pending" | "processing" | "ready" | "error";
}

export interface CoursePreviewDefault {
  courseId: string;
  previewSeconds: number; // default 900 (15:00)
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
