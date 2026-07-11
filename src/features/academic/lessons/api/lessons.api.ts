import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, coreClient } from "../../../../shared/api/client";
import type { CoursePreviewDefault, LessonContent, LessonPreview, LessonType } from "../types";
import { lessonsKeys } from "./lessons.keys";

// --- Lesson content ---

interface LessonContentView {
  lessonId: string;
  bodyMd: string | null;
  readingMinutes: number | null;
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
  return useMutation<LessonPreview, Error, { previewSeconds: number | null }>({
    mutationFn: async (values) => {
      if (!lessonId) throw new Error("Missing lessonId");
      void courseId;
      await coreClient.patch(`/lessons/${lessonId}/preview`, { previewSeconds: values.previewSeconds });
      const res = await coreClient.get<LessonPreview>(`/lessons/${lessonId}/preview`);
      return res.data;
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
  return useMutation<CoursePreviewDefault, Error, { previewSeconds: number }>({
    mutationFn: async (values) => {
      if (!courseId) throw new Error("Missing courseId");
      await coreClient.patch(`/courses/${courseId}/preview-default`, {
        defaultPreviewSeconds: values.previewSeconds,
      });
      const res = await coreClient.get<CoursePreviewDefault>(`/courses/${courseId}/preview-default`);
      return res.data;
    },
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: lessonsKeys.coursePreviewDefault(courseId) });
    },
  });
}
