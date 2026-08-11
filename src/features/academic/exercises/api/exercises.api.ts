import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coreClient } from "../../../../shared/api/client";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import { exerciseKeys } from "./exercises.keys";
import type {
  ChallengeMcqQuestionItem,
  ChallengeRubricItem,
  ChallengeTestCaseItem,
  ChallengeTestCaseView,
  ChallengeView,
  ChallengeVisibility,
  CreateChallengeRequest,
  CreateQuestionRequest,
  CreateQuizRequest,
  QuizSummaryView,
  UpdateChallengeRequest,
} from "../types";

interface IdResponse {
  id: string;
}

// ------------------------------------------------------------------ quiz
export function useLessonQuizzes(lessonId: string | undefined) {
  return useQuery<QuizSummaryView[], Error>({
    queryKey: exerciseKeys.quizzes(lessonId),
    enabled: Boolean(lessonId),
    queryFn: () =>
      coreClient
        .get(`/courses/lessons/${lessonId}/quizzes`, {
          params: { includeDrafts: true },
        })
        .then((r) => r.data as QuizSummaryView[]),
  });
}

export function useCreateQuiz(lessonId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<IdResponse, Error, CreateQuizRequest>({
    mutationFn: (body) =>
      coreClient
        .post(`/courses/lessons/${lessonId}/quizzes`, body)
        .then((r) => r.data as IdResponse),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: exerciseKeys.quizzes(lessonId) });
    },
    onError: handleAdminMutationError,
  });
}

export function useAddQuizQuestion(lessonId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<IdResponse, Error, { quizId: string; body: CreateQuestionRequest }>({
    mutationFn: ({ quizId, body }) =>
      coreClient
        .post(`/courses/quizzes/${quizId}/questions`, body)
        .then((r) => r.data as IdResponse),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: exerciseKeys.quizzes(lessonId) });
    },
    onError: handleAdminMutationError,
  });
}

export function useDeleteQuizQuestion(lessonId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<void, Error, { questionId: string }>({
    mutationFn: ({ questionId }) =>
      coreClient.delete(`/courses/questions/${questionId}`).then(() => undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: exerciseKeys.quizzes(lessonId) });
    },
    onError: handleAdminMutationError,
  });
}

export function usePublishQuiz(lessonId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<void, Error, { quizId: string }>({
    mutationFn: ({ quizId }) =>
      coreClient.post(`/courses/quizzes/${quizId}/publish`).then(() => undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: exerciseKeys.quizzes(lessonId) });
    },
    onError: handleAdminMutationError,
  });
}

export function useUnpublishQuiz(lessonId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<void, Error, { quizId: string }>({
    mutationFn: ({ quizId }) =>
      coreClient.post(`/courses/quizzes/${quizId}/unpublish`).then(() => undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: exerciseKeys.quizzes(lessonId) });
    },
    onError: handleAdminMutationError,
  });
}

export function useArchiveQuiz(lessonId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<void, Error, { quizId: string }>({
    mutationFn: ({ quizId }) =>
      coreClient.delete(`/courses/quizzes/${quizId}`).then(() => undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: exerciseKeys.quizzes(lessonId) });
    },
    onError: handleAdminMutationError,
  });
}

// admin-challenge-unified-form §④: khối API Assignment (list/create/update/delete
// /courses/lessons/{id}/assignments*) đã GỠ — bài NỘP giờ là Challenge CODE có submissionMethod +
// gradingConfig, tạo/sửa qua ChallengeWizardDrawer/ChallengeEditModal (endpoint /challenges).

// -------------------------------------------------------------- challenge
/**
 * Challenge của MỘT bài học — GET /admin/challenges/by-lesson?lessonId= (mọi status + mọi visibility,
 * kể cả DRAFT và COURSE_ONLY). Trước đây gọi GET /challenges (list PUBLIC/Workplace) rồi lọc client
 * theo lessonId → BỎ SÓT challenge COURSE_ONLY của khoá (mặc định khi tạo) nên panel bài "không có
 * challenge". Endpoint admin by-lesson (V284) trả đúng của bài, mọi trạng thái.
 */
export function useLessonChallenges(lessonId: string | undefined, enabled = true) {
  return useQuery<ChallengeView[], Error>({
    queryKey: exerciseKeys.lessonChallenges(lessonId),
    enabled: enabled && Boolean(lessonId),
    queryFn: () =>
      coreClient
        .get(`/admin/challenges/by-lesson`, { params: { lessonId } })
        .then((r) => r.data as ChallengeView[]),
  });
}

/**
 * Thử thách CHƯA GẮN bài của 1 khoá (kho): GET /admin/challenges?courseId= trả MỌI status kể cả
 * DRAFT và challenge lessonId=null. Đây là lưới an toàn sau khi gỡ tab "Kho thử thách": wizard tạo
 * challenge (POST) trước rồi mới gắn (PUT lesson) — nếu người dùng đóng giữa chừng hoặc gắn bị 409
 * thì challenge mồ côi (lessonId=null) chỉ còn thấy ở đây (GET /challenges công khai lọc mất DRAFT).
 * Lọc client-side lessonId==null để chỉ hiện đám mồ côi.
 */
export function useCourseUnattachedChallenges(courseId: string | undefined, enabled = true) {
  return useQuery<ChallengeView[], Error>({
    queryKey: exerciseKeys.courseChallenges(courseId),
    enabled: enabled && Boolean(courseId),
    queryFn: () =>
      coreClient
        .get(`/admin/challenges`, { params: { courseId } })
        .then((r) => r.data as ChallengeView[]),
    select: (all) => all.filter((c) => c.lessonId == null),
  });
}

export function useCreateChallenge() {
  const qc = useQueryClient();
  return useMutation<ChallengeView, Error, CreateChallengeRequest>({
    mutationFn: (body) =>
      coreClient.post(`/challenges`, body).then((r) => r.data as ChallengeView),
    onSuccess: () => {
      // Prefix rộng: phủ challenges + course-challenges + lesson-challenges (by-lesson) để mọi
      // danh sách challenge (kho khoá + panel bài) refresh sau tạo/gắn/publish/visibility/sửa.
      qc.invalidateQueries({ queryKey: exerciseKeys.all });
    },
    // KHÔNG auto-notify: wizard tự hiển thị lỗi inline theo bước.
  });
}

/**
 * Sửa 1 challenge đã tạo (admin-challenge-edit): PATCH /admin/challenges/{id} — PARTIAL, chỉ gửi
 * field ĐỔI (BE: null → giữ nguyên). Chính là để chỉnh cờ `free` ("học thử") sau khi tạo, kèm
 * title/description. Cùng client/base với useSetChallengeVisibility (coreClient + /admin/challenges/*).
 * Thành công → invalidate danh sách challenge (per-lesson) + kho khoá để hàng refresh cờ/meta ngay.
 */
export function useUpdateChallenge() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; body: UpdateChallengeRequest }>({
    mutationFn: ({ id, body }) =>
      coreClient.patch(`/admin/challenges/${id}`, body).then(() => undefined),
    onSuccess: () => {
      // Prefix rộng: phủ challenges + course-challenges + lesson-challenges (by-lesson) để mọi
      // danh sách challenge (kho khoá + panel bài) refresh sau tạo/gắn/publish/visibility/sửa.
      qc.invalidateQueries({ queryKey: exerciseKeys.all });
      qc.invalidateQueries({ queryKey: [...exerciseKeys.all, "course-challenges"] });
    },
    onError: handleAdminMutationError,
  });
}

export function useUpsertChallengeMcq() {
  return useMutation<void, Error, { id: string; questions: ChallengeMcqQuestionItem[] }>({
    mutationFn: ({ id, questions }) =>
      coreClient.put(`/challenges/${id}/mcq-questions`, { questions }).then(() => undefined),
  });
}

/**
 * challenge-testcase-editor §2.1: đọc lại test case ĐÃ LƯU của 1 challenge —
 * `GET /admin/challenges/{id}/test-cases` (BE change `challenge-testcase-judge` task 3.1: audit +
 * authz owner-course fallback như các route admin khác). Trước change này FE KHÔNG có đường đọc test
 * case ⇒ tạo xong là mất đường sửa.
 *
 * Response chưa chốt cứng (BE xây song song): trả thẳng mảng HOẶC bọc `{testCases:[...]}` — chuẩn
 * hoá bằng `readTestCaseList` (pure, có unit test) thay vì ép kiểu mù.
 */
export function useChallengeTestCases(challengeId: string | undefined, enabled = true) {
  return useQuery<ChallengeTestCaseView[], Error>({
    queryKey: exerciseKeys.testCases(challengeId),
    enabled: enabled && Boolean(challengeId),
    // Test case là dữ liệu tác giả tự sửa; đừng phục vụ cache cũ khi mở lại trình soạn.
    staleTime: 0,
    queryFn: () =>
      coreClient
        .get(`/admin/challenges/${challengeId}/test-cases`)
        .then((r) => readTestCaseList(r.data)),
  });
}

/**
 * PUT replace TOÀN BỘ test case của challenge, qua path ADMIN `/admin/challenges/{id}/test-cases`
 * (cùng authz `canManageCourseBank` + audit như các route admin khác). KHÔNG dùng path công khai
 * `/challenges/{id}/test-cases`: nó đòi quyền global `challenge.manage`, nên chủ khoá không có
 * quyền đó sẽ ĐỌC/nhập được (route admin có owner-fallback) mà LƯU thì 403. BE cấp route admin
 * trong cùng đợt `challenge-testcase-judge` §3.1.
 */
export function useUpsertChallengeTestCases() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; testCases: ChallengeTestCaseItem[] }>({
    mutationFn: ({ id, testCases }) =>
      coreClient.put(`/admin/challenges/${id}/test-cases`, { testCases }).then(() => undefined),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: exerciseKeys.testCases(vars.id) });
    },
  });
}

/**
 * challenge-testcase-editor §3.1: import hàng loạt test case từ ZIP kiểu HackerRank —
 * `POST /admin/challenges/{id}/test-cases/import` (multipart). BE parse server-side 2 layout
 * (`input/inputNN.txt`+`output/outputNN.txt`, hoặc cặp phẳng `NN.in`/`NN.out`), KHÔNG lưu file, trả
 * `{imported, skipped:[{entry,reason}]}`.
 *
 * QUAN TRỌNG: default của `coreClient` là `Content-Type: application/json` — không override thì axios
 * `JSON.stringify` FormData và BE nhận rỗng. Truyền per-request `Content-Type: undefined` để
 * axios/browser tự đặt `multipart/form-data; boundary=…` (giống `useUploadResourceFile`).
 * Timeout dài: giải nén + ghi tới 200 case ở BE lâu hơn request thường.
 */
export function useImportChallengeTestCasesZip() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, { id: string; file: File; dryRun?: boolean }>({
    mutationFn: ({ id, file, dryRun }) => {
      const form = new FormData();
      form.append("file", file, file.name);
      return coreClient
        .post(`/admin/challenges/${id}/test-cases/import`, form, {
          headers: { "Content-Type": undefined },
          // dryRun=true CHỈ trả bản xem trước, KHÔNG ghi DB. Import thật là THAY THẾ toàn bộ bộ
          // test hiện có, nên bước xem trước bắt buộc phải dryRun — nếu không, chỉ "xem thử" đã xoá
          // sạch test case cũ.
          params: dryRun ? { dryRun: true } : undefined,
          timeout: 180_000,
        })
        .then((r) => r.data as unknown);
    },
    onSuccess: (_data, vars) => {
      if (vars.dryRun) {
        return; // xem trước không đổi dữ liệu → không cần invalidate
      }
      qc.invalidateQueries({ queryKey: exerciseKeys.testCases(vars.id) });
    },
    // KHÔNG auto-notify: component hiện lỗi + preview inline (zip bomb / vượt cap / không có cặp hợp lệ).
  });
}

/**
 * Chuẩn hoá payload GET test-cases: chấp nhận mảng thuần HOẶC bọc `{testCases:[...]}` (đối xứng với
 * body PUT). Payload lạ / rỗng → mảng rỗng thay vì ném — trình soạn vẫn mở được để tác giả nhập tay.
 * Pure → unit test ở `TestCaseEditor.test.ts`.
 */
export function readTestCaseList(payload: unknown): ChallengeTestCaseView[] {
  if (Array.isArray(payload)) return payload as ChallengeTestCaseView[];
  if (payload && typeof payload === "object") {
    const wrapped = (payload as { testCases?: unknown }).testCases;
    if (Array.isArray(wrapped)) return wrapped as ChallengeTestCaseView[];
  }
  return [];
}

export function useUpsertChallengeRubrics() {
  return useMutation<void, Error, { id: string; rubrics: ChallengeRubricItem[] }>({
    mutationFn: ({ id, rubrics }) =>
      coreClient.put(`/challenges/${id}/rubrics`, { rubrics }).then(() => undefined),
  });
}

// PUT /challenges/{id}/lesson — 409 CHALLENGE_LESSON_ALREADY_ATTACHED khi lesson đã có
// challenge active khác (uq_challenge_lesson_active). Component catch để hiện đích danh.
export function useLinkChallengeLesson() {
  const qc = useQueryClient();
  return useMutation<ChallengeView, Error, { id: string; lessonId: string }>({
    mutationFn: ({ id, lessonId }) =>
      coreClient
        .put(`/challenges/${id}/lesson`, { lessonId })
        .then((r) => r.data as ChallengeView),
    onSuccess: () => {
      // Prefix rộng: phủ challenges + course-challenges + lesson-challenges (by-lesson) để mọi
      // danh sách challenge (kho khoá + panel bài) refresh sau tạo/gắn/publish/visibility/sửa.
      qc.invalidateQueries({ queryKey: exerciseKeys.all });
      // Gắn bài xong thì challenge rời "kho mồ côi" → làm mới danh sách chưa-gắn của mọi khoá.
      qc.invalidateQueries({ queryKey: [...exerciseKeys.all, "course-challenges"] });
    },
  });
}

/**
 * Xoá challenge (hard delete): DELETE /admin/challenges/{id} với body `{ reason }` (BE gác
 * requireReason). Nguy hiểm + không hoàn tác → qua DeleteConfirmModal. Alternative an toàn: Unpublish
 * (về DRAFT) hoặc Gỡ khỏi bài. Invalidate prefix rộng để mọi danh sách challenge refresh.
 */
export function useDeleteChallenge() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; reason: string }>({
    mutationFn: ({ id, reason }) =>
      coreClient.delete(`/admin/challenges/${id}`, { data: { reason } }).then(() => undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: exerciseKeys.all });
    },
    onError: handleAdminMutationError,
  });
}

export function usePublishChallenge() {
  const qc = useQueryClient();
  return useMutation<ChallengeView, Error, { id: string }>({
    mutationFn: ({ id }) =>
      coreClient.post(`/challenges/${id}/publish`).then((r) => r.data as ChallengeView),
    onSuccess: () => {
      // Prefix rộng: phủ challenges + course-challenges + lesson-challenges (by-lesson) để mọi
      // danh sách challenge (kho khoá + panel bài) refresh sau tạo/gắn/publish/visibility/sửa.
      qc.invalidateQueries({ queryKey: exerciseKeys.all });
      qc.invalidateQueries({ queryKey: [...exerciseKeys.all, "course-challenges"] });
    },
  });
}

/**
 * Đổi visibility 1 challenge: POST /admin/challenges/{id}/visibility { visibility }.
 * (course-editor-slimming) Relocate từ challenge-bank sang exercises: toggle Public<->Workplace nay
 * nằm trên per-lesson exercise card. Sau thành công invalidate danh sách challenge để hàng refresh.
 * Lỗi BE (vd CHALLENGE_INVALID_STATE) map qua handleAdminMutationError.
 */
export function useSetChallengeVisibility() {
  const qc = useQueryClient();
  return useMutation<ChallengeView, Error, { id: string; visibility: ChallengeVisibility }>({
    mutationFn: ({ id, visibility }) =>
      coreClient
        .post(`/admin/challenges/${id}/visibility`, { visibility })
        .then((r) => r.data as ChallengeView),
    onSuccess: () => {
      // Prefix rộng: phủ challenges + course-challenges + lesson-challenges (by-lesson) để mọi
      // danh sách challenge (kho khoá + panel bài) refresh sau tạo/gắn/publish/visibility/sửa.
      qc.invalidateQueries({ queryKey: exerciseKeys.all });
      qc.invalidateQueries({ queryKey: [...exerciseKeys.all, "course-challenges"] });
    },
    onError: handleAdminMutationError,
  });
}
