import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coreClient } from "../../../../shared/api/client";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import { challengeBankKeys } from "./challengeBank.keys";

export type ChallengeVisibility = "COURSE_ONLY" | "WORKSPACE_PUBLIC";

/**
 * Map BE BankChallengeView (change BE `course-challenge-bank`). Type/status là chuỗi BE
 * UPPERCASE — giữ nguyên, tag ở UI tự map màu. lessonId = null khi challenge nằm kho chưa gắn.
 */
export interface BankChallenge {
  id: string;
  title: string;
  slug: string;
  type: string; // MULTIPLE_CHOICE | CODE | ESSAY | CODING | SQL | UIUX | AI | BUSINESS
  status: string; // DRAFT | PUBLISHED | RUNNING | CLOSED | ARCHIVED
  visibility: ChallengeVisibility;
  courseId: string;
  lessonId: string | null;
  startsAt: string | null;
  endsAt: string | null;
  updatedAt: string | null;
}

/**
 * Kho challenge của 1 course: GET /api/v1/admin/challenges?courseId= (mọi status, kể cả DRAFT
 * và challenge chưa gắn lesson). Qua coreClient (base /api/v1) → path /admin/challenges.
 */
export function useCourseChallengeBank(courseId: string | undefined) {
  return useQuery<BankChallenge[], Error>({
    queryKey: challengeBankKeys.course(courseId),
    enabled: Boolean(courseId),
    queryFn: () =>
      coreClient
        .get(`/admin/challenges`, { params: { courseId } })
        .then((r) => r.data as BankChallenge[]),
  });
}

/**
 * Đổi visibility 1 challenge: POST /api/v1/admin/challenges/{id}/visibility {visibility}.
 * Sau thành công invalidate kho course để bảng refresh. Lỗi BE CHALLENGE_INVALID_STATE
 * (public challenge không ở trạng thái hoạt động) được map thành message dễ hiểu qua
 * handleAdminMutationError (bảng ADMIN_ERROR_MESSAGES).
 */
export function useSetChallengeVisibility(courseId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<
    BankChallenge,
    Error,
    { id: string; visibility: ChallengeVisibility }
  >({
    mutationFn: ({ id, visibility }) =>
      coreClient
        .post(`/admin/challenges/${id}/visibility`, { visibility })
        .then((r) => r.data as BankChallenge),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: challengeBankKeys.course(courseId) });
    },
    onError: handleAdminMutationError,
  });
}
