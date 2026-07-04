import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../../shared/api/client";
import type { CoursePreviewDefault, LessonContent, LessonPreview, LessonType } from "../types";
import { lessonsKeys } from "./lessons.keys";

// --- Mock in-memory store while BE course-freemium-preview is not merged ---
const mockContentStore = new Map<string, LessonContent>();
const mockPreviewStore = new Map<string, LessonPreview>();
const mockCoursePreviewStore = new Map<string, CoursePreviewDefault>();

const DEFAULT_COURSE_PREVIEW_SECONDS = 15 * 60; // 15:00

function getOrInitPreview(lessonId: string, lessonType: LessonType): LessonPreview {
  const existing = mockPreviewStore.get(lessonId);
  if (existing) return existing;
  const next: LessonPreview = {
    lessonId,
    lessonType,
    previewSeconds: null,
    effectivePreviewSeconds: DEFAULT_COURSE_PREVIEW_SECONDS,
    videoDurationSeconds: 3600,
    videoStatus: "ready",
  };
  mockPreviewStore.set(lessonId, next);
  return next;
}

function getOrInitCoursePreviewDefault(courseId: string): CoursePreviewDefault {
  const existing = mockCoursePreviewStore.get(courseId);
  if (existing) return existing;
  const next: CoursePreviewDefault = { courseId, previewSeconds: DEFAULT_COURSE_PREVIEW_SECONDS };
  mockCoursePreviewStore.set(courseId, next);
  return next;
}

// --- Lesson content ---

export function useLessonContent(lessonId: string | undefined, lessonType?: LessonType) {
  return useQuery<LessonContent, Error>({
    queryKey: lessonsKeys.content(lessonId),
    queryFn: () => {
      if (!lessonId) throw new Error("Missing lessonId");
      // MOCK: replace with apiClient.get(`/lessons/${lessonId}/content`) when BE ready
      void apiClient;
      const existing = mockContentStore.get(lessonId);
      if (existing) return existing;
      const next: LessonContent = {
        lessonId,
        lessonType: lessonType ?? "DOCUMENT",
        body: "",
        hasContent: false,
        updatedAt: new Date().toISOString(),
      };
      mockContentStore.set(lessonId, next);
      return next;
    },
    enabled: !!lessonId,
  });
}

export function useUpdateLessonContent(lessonId: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<LessonContent, Error, { body: string; lessonType: LessonType }>({
    mutationFn: async (values) => {
      if (!lessonId) throw new Error("Missing lessonId");
      // MOCK: replace with apiClient.put(`/lessons/${lessonId}/content`, values) when BE ready
      void apiClient;
      if (values.lessonType !== "DOCUMENT") {
        const err = new Error("LESSON_TYPE_MISMATCH");
        err.name = "ApiError";
        throw err;
      }
      const next: LessonContent = {
        lessonId,
        lessonType: values.lessonType,
        body: values.body,
        hasContent: values.body.trim().length > 0,
        updatedAt: new Date().toISOString(),
      };
      mockContentStore.set(lessonId, next);
      return next;
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
    queryFn: () => {
      if (!lessonId) throw new Error("Missing lessonId");
      // MOCK: replace with apiClient.get(`/lessons/${lessonId}/preview`) when BE ready
      void apiClient;
      return getOrInitPreview(lessonId, lessonType ?? "VIDEO");
    },
    enabled: !!lessonId,
  });
}

export function useUpdateLessonPreview(lessonId: string | undefined, courseId?: string) {
  const queryClientLocal = useQueryClient();
  return useMutation<LessonPreview, Error, { previewSeconds: number | null }>({
    mutationFn: async (values) => {
      if (!lessonId) throw new Error("Missing lessonId");
      // MOCK: replace with apiClient.patch(`/lessons/${lessonId}/preview`, values) when BE ready
      void apiClient;
      const existing = getOrInitPreview(lessonId, "VIDEO");
      const courseDefault = getOrInitCoursePreviewDefault(courseId ?? "course-mock");
      const next: LessonPreview = {
        ...existing,
        previewSeconds: values.previewSeconds,
        effectivePreviewSeconds:
          values.previewSeconds === null
            ? courseDefault.previewSeconds
            : values.previewSeconds,
      };
      mockPreviewStore.set(lessonId, next);
      return next;
    },
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: lessonsKeys.preview(lessonId) });
    },
  });
}

// --- Course preview default ---

export function useCoursePreviewDefault(courseId: string | undefined) {
  return useQuery<CoursePreviewDefault, Error>({
    queryKey: lessonsKeys.coursePreviewDefault(courseId),
    queryFn: () => {
      if (!courseId) throw new Error("Missing courseId");
      // MOCK: replace with apiClient.get(`/courses/${courseId}/preview-default`) when BE ready
      void apiClient;
      return getOrInitCoursePreviewDefault(courseId);
    },
    enabled: !!courseId,
  });
}

export function useUpdateCoursePreviewDefault(courseId: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<CoursePreviewDefault, Error, { previewSeconds: number }>({
    mutationFn: async (values) => {
      if (!courseId) throw new Error("Missing courseId");
      // MOCK: replace with apiClient.patch(`/courses/${courseId}/preview-default`, values) when BE ready
      void apiClient;
      const next: CoursePreviewDefault = { courseId, previewSeconds: values.previewSeconds };
      mockCoursePreviewStore.set(courseId, next);
      return next;
    },
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: lessonsKeys.coursePreviewDefault(courseId) });
    },
  });
}
