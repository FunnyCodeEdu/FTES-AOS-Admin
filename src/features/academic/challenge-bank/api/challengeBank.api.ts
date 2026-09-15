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
  submissionSummary: (courseId: string | undefined, challengeId: string | undefined) =>
    [...challengeBankKeys.all, "submission-summary", courseId, challengeId] as const,
  submissionAttempts: (
    courseId: string | undefined,
    challengeId: string | undefined,
    userId: string | undefined,
  ) => [...challengeBankKeys.all, "submission-attempts", courseId, challengeId, userId] as const,
};

export interface ChallengeSubmissionSummary {
  userId: string;
  attemptCount: number;
  latestSubmissionId: string;
  latestAttemptNo: number;
  latestStatus: string;
  latestScore: number | null;
  bestScore: number | null;
  latestPayloadType: string;
  lastSubmittedAt: string;
}

export interface ChallengeSubmissionAttempt {
  id: string;
  attemptNo: number;
  participantType: string;
  payloadType: string;
  codeContent: string | null;
  language: string | null;
  url: string | null;
  hasStoredFile: boolean;
  status: string;
  autoScore: number | null;
  manualScore: number | null;
  finalScore: number | null;
  submittedAt: string;
  answers: string | null;
  gradingModel: string | null;
  testCaseGraded: boolean | null;
}

export function useChallengeSubmissionSummary(
  courseId: string | undefined,
  challengeId: string | undefined,
) {
  return useQuery<ChallengeSubmissionSummary[], Error>({
    queryKey: challengeBankKeys.submissionSummary(courseId, challengeId),
    enabled: Boolean(courseId && challengeId),
    queryFn: () =>
      coreClient
        .get(`/admin/challenges/${challengeId}/submissions/summary`, { params: { courseId } })
        .then((r) => r.data as ChallengeSubmissionSummary[]),
  });
}

export function useChallengeSubmissionAttempts(
  courseId: string | undefined,
  challengeId: string | undefined,
  userId: string | undefined,
) {
  return useQuery<ChallengeSubmissionAttempt[], Error>({
    queryKey: challengeBankKeys.submissionAttempts(courseId, challengeId, userId),
    enabled: Boolean(courseId && challengeId && userId),
    queryFn: () =>
      coreClient
        .get(`/admin/challenges/${challengeId}/submissions`, {
          params: { courseId, userId },
        })
        .then((r) => r.data as ChallengeSubmissionAttempt[]),
  });
}

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

/**
 * Tạo NHIỀU challenge một lượt từ các bản nháp AI mà giảng viên đã tick chọn.
 *
 * Dùng endpoint batch chứ không gọi POST /challenges N lần: BE tạo trong MỘT transaction, nên lượt
 * thứ 3 hỏng thì không để lại 2 bài mồ côi mà giảng viên chẳng biết cái nào đã vào.
 */
export interface BatchChallengeItem {
  challenge: Record<string, unknown>;
  /** Bài học nguồn — gửi RIÊNG vì CreateChallengeRequest của BE không có field này. */
  lessonId?: string;
  /** Chỉ gửi phần thuộc về loại đó; null/bỏ trống = loại này không có phần con. */
  testCases?: Array<Record<string, unknown>> | null;
  mcq?: Array<Record<string, unknown>> | null;
  rubrics?: Array<Record<string, unknown>> | null;
}

export function createChallengesBatch(
  items: BatchChallengeItem[],
): Promise<Array<{ id: string; title: string }>> {
  return coreClient
    .post("/challenges/batch", { items })
    .then((r: { data?: unknown }) => ((r.data as { data?: unknown })?.data ?? r.data ?? []) as Array<{
      id: string;
      title: string;
    }>);
}
