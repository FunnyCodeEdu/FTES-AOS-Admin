// Trạng thái "knowledge" (grounding AI tutor dùng in-scope) của bài học + trigger sinh transcript.
// Endpoint nằm dưới /api/v1/ai (khác base /api/v1/admin của apiClient) → override baseURL
// per-request để vẫn dùng chung interceptor (Bearer + refresh 401 + bóc envelope). Gác BE:
// hasAuthority('ai.teacher.use'). Mirror pattern features/ai/api + ai-assist/api.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../../shared/api/client";
import { useMe } from "../../../auth/api";

const AI_BASE = `${import.meta.env.VITE_API_BASE_URL ?? ""}/api/v1/ai`;

/**
 * DOCUMENT_READY: bài DOCUMENT có body_md → sẵn sàng, không cần job.
 * NONE: bài VIDEO chưa có transcript job.
 * PENDING/RUNNING: job transcript đang chạy (poll tiếp).
 * COMPLETED: transcript xong → hasKnowledge=true.
 * FAILED: job lỗi → cho tạo lại.
 */
export type LessonKnowledgeStatus =
  | "DOCUMENT_READY"
  | "NONE"
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED";

export interface LessonKnowledge {
  lessonId: string;
  type: string;
  hasVideo: boolean;
  videoId: string | null;
  status: LessonKnowledgeStatus;
  hasKnowledge: boolean;
  jobId: string | null;
  updatedAt: string | null;
}

export interface LessonKnowledgeGenerateResult {
  // BE trả jobId=null cho bài DOCUMENT (no-op DOCUMENT_READY) — khớp LessonKnowledge.jobId nullable.
  jobId: string | null;
  status: LessonKnowledgeStatus;
}

/** Một dòng trạng thái knowledge dùng cho cột danh sách (bulk endpoint). */
export interface LessonKnowledgeRow {
  lessonId: string;
  status: LessonKnowledgeStatus;
  hasKnowledge: boolean;
}

const knowledgeKeys = {
  all: ["ai", "lesson-knowledge"] as const,
  lesson: (lessonId: string | undefined) =>
    lessonId
      ? (["ai", "lesson-knowledge", lessonId] as const)
      : (["ai", "lesson-knowledge"] as const),
  course: (courseId: string | undefined) =>
    courseId
      ? (["ai", "course-lessons-knowledge", courseId] as const)
      : (["ai", "course-lessons-knowledge"] as const),
};

const ACTIVE = new Set<LessonKnowledgeStatus>(["PENDING", "RUNNING"]);

/**
 * Trạng thái knowledge của 1 bài (GET /ai/admin/lessons/{id}/knowledge). Tự POLL 4s khi
 * PENDING/RUNNING để badge tự cập nhật đến khi COMPLETED/FAILED.
 */
export function useLessonKnowledge(lessonId: string | undefined) {
  // Endpoint gác BE hasAuthority('ai.teacher.use'). Không gate ở FE thì user thiếu quyền tạo 403 chắc
  // chắn (×3 retry mặc định) mỗi lần mở trang soạn bài. Chỉ fetch khi có quyền; 403 cũng không retry.
  const { data: me } = useMe();
  const canUseAi = !!me?.permissions.includes("ai.teacher.use");
  return useQuery<LessonKnowledge, Error>({
    queryKey: knowledgeKeys.lesson(lessonId),
    queryFn: () =>
      apiClient
        .get(`/admin/lessons/${lessonId}/knowledge`, { baseURL: AI_BASE })
        .then((r) => r.data as LessonKnowledge),
    enabled: !!lessonId && canUseAi,
    retry: false,
    refetchInterval: (query) =>
      query.state.data && ACTIVE.has(query.state.data.status) ? 4000 : false,
  });
}

/**
 * Trigger sinh knowledge (transcript) cho bài VIDEO (POST /ai/admin/lessons/{id}/knowledge/generate).
 * Idempotent + Redis lock ở BE. Thành công → invalidate query để badge chuyển sang PENDING/RUNNING.
 */
export function useGenerateLessonKnowledge(lessonId: string | undefined) {
  const queryClientLocal = useQueryClient();
  return useMutation<LessonKnowledgeGenerateResult, Error, void>({
    mutationFn: async () => {
      if (!lessonId) throw new Error("Missing lessonId");
      const res = await apiClient.post(
        `/admin/lessons/${lessonId}/knowledge/generate`,
        undefined,
        { baseURL: AI_BASE }
      );
      return res.data as LessonKnowledgeGenerateResult;
    },
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: knowledgeKeys.lesson(lessonId) });
    },
  });
}

/**
 * Bulk trạng thái knowledge cho mọi bài của 1 khoá (GET /ai/admin/courses/{id}/lessons/knowledge) —
 * cho cột trong danh sách bài học. 1 query gộp thay vì N request per-lesson.
 */
export function useCourseLessonsKnowledge(courseId: string | undefined) {
  // Cùng lý do useLessonKnowledge: endpoint gác ai.teacher.use → chỉ fetch khi có quyền, không retry
  // 403. Cột knowledge là phụ; user thiếu quyền chỉ thấy cột trống thay vì spam request lỗi.
  const { data: me } = useMe();
  const canUseAi = !!me?.permissions.includes("ai.teacher.use");
  return useQuery<Record<string, LessonKnowledgeRow>, Error>({
    queryKey: knowledgeKeys.course(courseId),
    queryFn: async () => {
      const res = await apiClient.get(`/admin/courses/${courseId}/lessons/knowledge`, {
        baseURL: AI_BASE,
      });
      const rows = (res.data as LessonKnowledgeRow[] | null) ?? [];
      return Object.fromEntries(rows.map((row) => [row.lessonId, row]));
    },
    enabled: !!courseId && canUseAi,
    retry: false,
  });
}
