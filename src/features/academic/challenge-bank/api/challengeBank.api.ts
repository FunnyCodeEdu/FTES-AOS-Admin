import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coreClient } from "../../../../shared/api/client";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import { exerciseKeys } from "../../exercises/api/exercises.keys";
import type { ChallengeView } from "../../exercises/types";

/**
 * Kho challenge của khoá (challenge-bank & lesson-assign). Dùng ĐÚNG path admin theo hợp đồng BE
 * V284 (chưa deploy lúc viết): mọi endpoint dưới `coreClient` (base `/api/v1`) + tiền tố `/admin`.
 * Envelope `{code,message,data}` đã được interceptor bóc thành `r.data`.
 */

/** BankChallengeView (2.1/2.2): ChallengeView + updatedAt (kho hiển thị MỌI status kể cả DRAFT/ARCHIVED). */
export interface BankChallengeView extends ChallengeView {
  updatedAt?: string | null;
}

/** Báo cáo đối soát migrate bài tập legacy → challenge (2.5). */
export interface ChallengeCoverage {
  courseId: string;
  totalAssignments: number;
  migrated: number;
  /** khác rỗng = còn bài tập CHƯA migrate */
  missingAssignmentIds: string[];
  /** challenge trong kho chưa gắn lesson nào */
  unattachedChallenges: number;
  byStatus: Record<string, number>;
}

export interface BulkAssignItem {
  challengeId: string;
  lessonId: string;
}

/** Kết quả từng dòng của gán hàng loạt (2.4) — 1 dòng lỗi KHÔNG làm hỏng cả lô. */
export interface BulkAssignResult {
  challengeId: string;
  lessonId: string;
  ok: boolean;
  errorCode: string | null;
  message: string | null;
}

export const challengeBankKeys = {
  all: ["admin", "challenge-bank"] as const,
  bank: (courseId: string | undefined) => [...challengeBankKeys.all, "bank", courseId] as const,
  coverage: (courseId: string | undefined) =>
    [...challengeBankKeys.all, "coverage", courseId] as const,
};

/**
 * 2.1 — TOÀN BỘ kho challenge của khoá (mọi status, cả đã-gắn lẫn chưa-gắn). Khác
 * `useCourseUnattachedChallenges` (lọc client-side lessonId==null) — ở đây giữ nguyên để đếm
 * số challenge/bài + render list phải/trái.
 */
export function useCourseChallengeBank(courseId: string | undefined, enabled = true) {
  return useQuery<BankChallengeView[], Error>({
    queryKey: challengeBankKeys.bank(courseId),
    enabled: enabled && Boolean(courseId),
    queryFn: () =>
      coreClient
        .get(`/admin/challenges`, { params: { courseId } })
        .then((r) => r.data as BankChallengeView[]),
  });
}

/** 2.5 — báo cáo đối soát "còn sót data" cho banner cảnh báo. */
export function useChallengeCoverage(courseId: string | undefined, enabled = true) {
  return useQuery<ChallengeCoverage, Error>({
    queryKey: challengeBankKeys.coverage(courseId),
    enabled: enabled && Boolean(courseId),
    queryFn: () =>
      coreClient
        .get(`/admin/challenges/coverage`, { params: { courseId } })
        .then((r) => r.data as ChallengeCoverage),
  });
}

/**
 * 2.3 — gán / gỡ 1 challenge khỏi bài. `lessonId: null` = GỠ (bỏ liên kết bài, KHÔNG rời kho khoá).
 * Challenge chưa thuộc kho nào (courseId=null) tự động nhận vào kho khoá của lesson.
 * Path admin theo spec V284 (khác `useLinkChallengeLesson` cũ dùng path non-admin, chỉ gán không gỡ).
 */
export function useSetChallengeLesson(courseId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<ChallengeView, Error, { id: string; lessonId: string | null }>({
    mutationFn: ({ id, lessonId }) =>
      coreClient
        .put(`/admin/challenges/${id}/lesson`, { lessonId })
        .then((r) => r.data as ChallengeView),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: challengeBankKeys.bank(courseId) });
      qc.invalidateQueries({ queryKey: challengeBankKeys.coverage(courseId) });
      qc.invalidateQueries({ queryKey: exerciseKeys.challenges() });
      qc.invalidateQueries({ queryKey: [...exerciseKeys.all, "course-challenges"] });
    },
    onError: handleAdminMutationError,
  });
}

/**
 * 2.4 — gán HÀNG LOẠT. Trả kết quả từng dòng (ok/errorCode/message); component render lỗi theo dòng.
 * Chỉ reject (onError) khi cả request hỏng (vd items rỗng → 400 ADMIN_INVALID_PARAM).
 */
export function useBulkAssignChallenges(courseId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<BulkAssignResult[], Error, BulkAssignItem[]>({
    mutationFn: (items) =>
      coreClient
        .post(`/admin/challenges/lesson-assign`, { items })
        .then((r) => r.data as BulkAssignResult[]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: challengeBankKeys.bank(courseId) });
      qc.invalidateQueries({ queryKey: challengeBankKeys.coverage(courseId) });
      qc.invalidateQueries({ queryKey: exerciseKeys.challenges() });
      qc.invalidateQueries({ queryKey: [...exerciseKeys.all, "course-challenges"] });
    },
    onError: handleAdminMutationError,
  });
}
