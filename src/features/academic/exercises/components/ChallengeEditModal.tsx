import { useEffect, useState } from "react";
import { ChallengeDescriptionEditor } from "./ChallengeDescriptionEditor";
import {
  Alert,
  Button,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Spin,
  Space,
  Switch,
  Typography,
  message,
} from "antd";
import { EditOutlined, ExperimentOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import {
  useChallengeBank,
  useChallengeTags,
  useSetChallengeTags,
} from "../../challenge-bank/api/challengeBankConsole.api";
import { ChallengeTagPicker } from "../../challenge-bank/components/ChallengeTagPicker";
import type { BankPageResponse } from "../../challenge-bank/types";
import { SubjectSelect } from "../../components/SubjectSelect";
import { useAdminChallengeDetail, useUpdateChallenge } from "../api/exercises.api";
import {
  formatChallengeSchedule,
  isUnlimitedClose,
  NO_CLOSE_LABEL,
  OPEN_NOW_LABEL,
} from "../challengeSchedule";
import type { ChallengeView, SubmissionMethod, UpdateChallengeRequest } from "../types";
import {
  acceptsSqlExtension,
  AI_FEEDBACK_LIMIT_DEFAULT,
  AI_FEEDBACK_LIMIT_HINT,
  AI_FEEDBACK_LIMIT_MAX,
  AI_FEEDBACK_LIMIT_MIN,
  buildStarterCodeMap,
  clampAiFeedbackLimit,
  SeedSqlUpload,
  StarterCodeEditor,
  starterCodeMapToRows,
  type StarterCodeRow,
} from "./ChallengeWizardDrawer";
import { TestCaseManagerDrawer } from "./TestCaseManagerDrawer";
import { McqQuestionManagerDrawer } from "./McqQuestionManagerDrawer";

/** File cho phép nộp khi tác giả chọn FILE hoặc BOTH (mirror wizard/assignment cũ). */
const allowsFile = (m: SubmissionMethod | undefined): boolean => m === "FILE" || m === "BOTH";

/**
 * code-sandbox-assignment §2C: seed .sql hiện tại của challenge để pre-fill + so-diff khi sửa. Ưu tiên
 * field top-level `seedSql` (BE §2A lộ từ grading_config); fallback parse `gradingConfig` JSON cho
 * response cũ. Trả "" khi không có / JSON hỏng.
 */
export function resolveOriginalSeedSql(
  original: { seedSql?: string | null; gradingConfig?: string | null }
): string {
  const top = (original.seedSql ?? "").trim();
  if (top) return top;
  const raw = original.gradingConfig;
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw) as { seedSql?: unknown };
    return typeof parsed.seedSql === "string" ? parsed.seedSql.trim() : "";
  } catch {
    return "";
  }
}

/**
 * algo-testcase-starter §3: map sườn code hiện tại của challenge để pre-fill + so-diff khi sửa. Đọc từ
 * `gradingConfig.starterCode` (BE lộ learner-safe; KHÔNG có field top-level). Chỉ giữ cặp string→string;
 * bỏ giá trị không phải chuỗi / JSON hỏng. Trả {} khi vắng.
 */
export function resolveOriginalStarterCode(
  original: { gradingConfig?: string | null }
): Record<string, string> {
  const raw = original.gradingConfig;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as { starterCode?: unknown };
    const sc = parsed.starterCode;
    if (!sc || typeof sc !== "object") return {};
    const map: Record<string, string> = {};
    for (const [lang, code] of Object.entries(sc as Record<string, unknown>)) {
      if (typeof code === "string") map[lang] = code;
    }
    return map;
  } catch {
    return {};
  }
}

/**
 * challenge-testcase-sample-ui §3 — số lần AI nhận xét HIỆN TẠI của challenge, để pre-fill + diff.
 * Ưu tiên field top-level `aiFeedbackLimit` (BE lộ ở challenge detail); fallback parse
 * `gradingConfig.aiFeedbackLimit` (nơi BE thực sự lưu) cho response cũ/slim. Trả `undefined` khi
 * challenge chưa từng đặt — caller tự rơi về mặc định 1.
 */
export function resolveOriginalAiFeedbackLimit(
  original: { aiFeedbackLimit?: number | null; gradingConfig?: string | null }
): number | undefined {
  const top = original.aiFeedbackLimit;
  if (typeof top === "number" && Number.isFinite(top)) return clampAiFeedbackLimit(top);
  const raw = original.gradingConfig;
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as { aiFeedbackLimit?: unknown };
    const nested = parsed.aiFeedbackLimit;
    return typeof nested === "number" && Number.isFinite(nested)
      ? clampAiFeedbackLimit(nested)
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Nội dung đề/tiêu chí thật sống trong grading_config. Detail mới lộ thêm field phẳng để form không
 * phải hiểu JSON; fallback parse blob giữ tương thích với response cũ và fixture test.
 */
export function resolveOriginalAuthoringText(
  original: {
    question?: string | null;
    criteria?: string | null;
    gradingConfig?: string | null;
  },
  field: "question" | "criteria"
): string {
  const top = original[field];
  if (typeof top === "string" && top.trim()) return top.trim();
  const raw = original.gradingConfig;
  if (!raw) return "";
  try {
    const value = (JSON.parse(raw) as Record<string, unknown>)[field];
    return typeof value === "string" ? value.trim() : "";
  } catch {
    return "";
  }
}

/**
 * challenge-testcase-sample-ui §3.2 — thử thách này có ô "Số lần AI nhận xét" không?
 * CHỈ bài CODE chấm bằng TEST CASE: bài CODE dạng NỘP (có `submissionMethod`) thì AI CHẤM ĐIỂM chứ
 * không phải nhận xét thêm, MCQ/ESSAY lại càng không — bày ô ở đó là control giả.
 */
export function supportsAiFeedbackLimit(
  challenge:
    | { type?: string | null; submissionMethod?: SubmissionMethod | null }
    | null
    | undefined
): boolean {
  return Boolean(challenge && challenge.type === "CODE" && !challenge.submissionMethod);
}

/** Chỉ lần đổi CODE sandbox → Project mới bắt buộc nhập prompt/rubric trước khi đổi grading route. */
export function isSandboxToProjectConversion(
  challenge:
    | { type?: string | null; submissionMethod?: SubmissionMethod | null }
    | null
    | undefined,
  nextSubmissionMethod: SubmissionMethod | undefined
): boolean {
  return Boolean(
    challenge?.type === "CODE" &&
    !challenge.submissionMethod &&
    nextSubmissionMethod
  );
}

export interface AuthoringTextRequirements {
  question: boolean;
  criteria: boolean;
}

/**
 * Conversion mới cần đủ hai field. Project hiện hữu chỉ bắt giữ field nào VỐN đã có: nhờ vậy không
 * ai xoá trắng nội dung tốt, nhưng record legacy đang thiếu criteria vẫn sửa title/meta được.
 */
export function authoringTextRequirements(
  challenge:
    | {
        type?: string | null;
        submissionMethod?: SubmissionMethod | null;
        question?: string | null;
        criteria?: string | null;
        gradingConfig?: string | null;
      }
    | null
    | undefined,
  nextSubmissionMethod: SubmissionMethod | undefined
): AuthoringTextRequirements {
  const conversion = isSandboxToProjectConversion(challenge, nextSubmissionMethod);
  const existingProject = Boolean(
    challenge?.type === "CODE" && challenge.submissionMethod
  );
  return {
    question: Boolean(
      conversion ||
      (existingProject && challenge && resolveOriginalAuthoringText(challenge, "question"))
    ),
    criteria: Boolean(
      conversion ||
      (existingProject && challenge && resolveOriginalAuthoringText(challenge, "criteria"))
    ),
  };
}

/** So khớp 2 map sườn code không phụ thuộc thứ tự key (algo-testcase-starter §3). */
export function starterCodeMapsEqual(
  a: Record<string, string>,
  b: Record<string, string>
): boolean {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  return ak.every((k) => b[k] === a[k]);
}

/**
 * challenge-testcase-editor §4 — lịch hiện tại của challenge → giá trị `RangePicker`.
 * Mốc ĐÓNG vắng / không hợp lệ / sentinel `2999-12-31` (dữ liệu cũ, BE cố tình không migrate) đều
 * hiện là Ô TRỐNG = "Không giới hạn" thay vì in ra năm 2999 (dùng chung `isUnlimitedClose`).
 */
export function challengeScheduleToRange(
  challenge: Pick<ChallengeView, "startsAt" | "endsAt">
): [Dayjs | null, Dayjs | null] {
  const opensAt =
    challenge.startsAt && dayjs(challenge.startsAt).isValid() ? dayjs(challenge.startsAt) : null;
  const closesAt = isUnlimitedClose(challenge.endsAt) ? null : dayjs(challenge.endsAt);
  return [opensAt, closesAt];
}

/** Mốc trên form trùng KHÍT mốc đang lưu (so theo epoch, không so chuỗi) ⇒ không đính vào PATCH. */
function sameInstant(current: string | null | undefined, next: Dayjs): boolean {
  if (!current) return false;
  const d = dayjs(current);
  return d.isValid() && d.valueOf() === next.valueOf();
}

/** Giá trị form Sửa challenge (meta cơ bản + cờ học thử; CODE bài NỘP thêm cách nộp + đuôi file + seed). */
export interface ChallengeEditFormValues {
  title: string;
  description?: string;
  /**
   * MÔN của thử thách. Có mặt ở đây vì đây là màn sửa mở được từ TRONG khoá/bài học — đường gắn môn
   * tại chỗ cho đám thử thách cũ đang có `subject_id = NULL`.
   *
   * ĐÍNH CHÍNH lời chú thích cũ ("`BankChallengeMetaModal` … nằm trong console Kho, đòi quyền
   * khác"): SAI. Hai modal gọi CÙNG một URL và CÙNG một gác quyền —
   * `BankChallengeMetaModal` đi `apiClient.patch("/challenges/{id}")` (base `${API_ROOT}/api/v1/admin`)
   * còn modal này đi `coreClient.patch("/admin/challenges/{id}")` (base `${API_ROOT}/api/v1`), cả hai
   * ra `PATCH /api/v1/admin/challenges/{id}`, mà BE gác `access.require("admin.challenge.manage")`
   * (`AdminChallengeController.update`) — KHÔNG có nhánh owner-fallback.
   *
   * Sự thật đáng nói hơn (mà lời cũ che mất): chủ khoá / giảng viên chỉ có leaf `challenge.manage`
   * (V330) KHÔNG dùng được màn Sửa này — họ ăn 403 ở PATCH. Nên mọi câu "nhờ gắn môn sau bằng nút
   * Sửa" chỉ đúng khi người bấm là quản trị viên thật.
   */
  subjectId?: string;
  /** challenge-free-flag: "Cho làm miễn phí (học thử)". */
  free: boolean;
  /**
   * challenge-testcase-editor §4: lịch [mở, đóng]. Vế ĐÓNG trống ⇒ "Không giới hạn"; vế MỞ trống ⇒
   * "Mở ngay". `undefined` = form không có control này (không đụng lịch) — KHÁC `null`/[null,null]
   * là "tác giả đã xoá cả hai mốc".
   */
  range?: [Dayjs | null, Dayjs | null] | null;
  /** Số lần nộp tối đa (sửa được sau khi tạo). */
  maxSubmissions?: number;
  /** Nội dung đầy đủ + rubric mà AI dùng để chấm (grading_config.question/criteria). */
  question?: string;
  criteria?: string;
  /** admin-challenge-unified-form §④: chỉ có ý nghĩa khi challenge.type === "CODE" (bài NỘP). */
  submissionMethod?: SubmissionMethod;
  fileExtension?: string;
  /** code-sandbox-assignment §2C: nội dung .sql seed (chỉ khi whitelist đuôi file chứa .sql). */
  seedSql?: string;
  /** algo-testcase-starter §3: sườn code per-ngôn-ngữ (rows) cho challenge CODE test-case. */
  starterCode?: StarterCodeRow[];
  /**
   * admin-challenge-bank-console §3.3: tag của thử thách (slug). Lưu bằng lệnh RIÊNG
   * (`PUT /admin/challenges/{id}/tags`, replace-set) chứ không nằm trong PATCH.
   */
  tags?: string[];
  /** challenge-testcase-sample-ui §3: số lần AI nhận xét (1..5) — chỉ bài CODE chấm bằng test case. */
  aiFeedbackLimit?: number;
}

/**
 * MÔN HIỆN TẠI của thử thách đang sửa: `undefined` = CHƯA BIẾT, `null` = BIẾT CHẮC là chưa gắn môn,
 * chuỗi = id môn đang lưu. Ba trạng thái, không phải hai — và đó là toàn bộ điểm của hàm này.
 *
 * Vì sao không đọc thẳng `challenge.subjectId`: prop `challenge` của modal luôn là một DÒNG DANH
 * SÁCH. `LessonExercisesCard` lấy từ `GET /admin/challenges/by-lesson`, `CourseChallengeBankTab` lấy
 * từ `GET /admin/challenges?courseId=` — cả hai trả `ChallengeQueryApi.BankChallengeView`, một record
 * KHÔNG có `subjectId` (chỉ id,title,slug,type,status,visibility,courseId,lessonId,startsAt,endsAt,
 * updatedAt,difficulty,submissionMethod,aiFeedbackLimit). Type FE nói dối
 * (`BankChallengeView extends ChallengeView`, mà `ChallengeView.subjectId` khai bắt buộc) nên tsc
 * không bắt được, còn runtime thì `challenge.subjectId` là `undefined` với MỌI thử thách — kể cả bài
 * đã gắn đúng môn. Ô "Môn học" trống trơn ở mọi hàng dẫn thẳng tới cú ghi đè im lặng: người sửa
 * tưởng bài thiếu môn, chọn đại, PATCH thay `subject_id` đang ĐÚNG bằng môn đoán.
 *
 * Nguồn thật là kho: `GET /admin/challenges/bank` trả `ChallengeBankApi.BankItem` CÓ `subjectId`.
 * Cùng bề mặt quyền với danh sách đã mở được modal (`requireBankScope`: quyền kho global HOẶC quản
 * đúng khoá đó), nên ai mở được modal thì đọc được dòng kho — trừ đúng ngách challenge chưa thuộc
 * khoá nào của người không có quyền global, và ngách đó rơi về "CHƯA BIẾT" chứ không đoán bừa.
 *
 * "Không thấy dòng" cũng là CHƯA BIẾT: coi nó là "chưa gắn môn" thì lại mở đúng cánh cửa ghi đè mù.
 */
export function resolveCurrentSubjectId(
  page: BankPageResponse | undefined,
  challengeId: string | undefined
): string | null | undefined {
  if (!page || !challengeId) return undefined;
  const row = page.items.find((r) => r.id === challengeId);
  if (!row) return undefined;
  return row.subjectId ?? null;
}

/**
 * Đổi môn ⇒ TAG MÃ MÔN đi theo (`tags` mà form đang giữ, gửi bằng `PUT /{id}/tags` khi bấm Lưu).
 *
 * Vì sao phải làm: modal này bày ô "Môn học" NGAY TRÊN `ChallengeTagPicker`. Đổi môn mà không đụng
 * tag thì sau một lần lưu, cùng một màn hình mang hai lời khai ngược nhau — cột `subject_id` nói
 * JPD113 còn tag vẫn `csd201`. Bộ lọc theo CỘT (trang Luyện tập của môn:
 * `findPublicBySubjectIdAndStatusIn`) và bộ lọc theo TAG (kho: `GET /admin/challenges/bank?tags=`)
 * từ đó trả hai tập khác nhau cho cùng câu hỏi "đề của môn nào". Đường TẠO ở BE đã suy tag từ môn
 * (`ChallengeCreateTags.defaultsFor` → `['pe', mã môn]`), nhưng đường SỬA thì không
 * (`ChallengeCommandApiImpl.update` chỉ `setSubjectId`), nên bề mặt nào bày ô đổi môn thì bề mặt đó
 * phải tự đồng bộ.
 *
 * Chỉ gỡ tag NHẬN DẠNG ĐƯỢC là mã môn (`knownSubjectCodes` = danh mục môn) — tag tự do của người
 * dùng (`pe`, `tuan-1`, …) giữ nguyên. Không phân giải được mã môn mới ⇒ TRẢ NGUYÊN tập cũ: thà để
 * lệch còn hơn gỡ tag môn cũ rồi không thêm được gì (im lặng làm mất phân loại).
 */
export function retagForSubject(
  currentTags: string[],
  nextSubjectCode: string | undefined | null,
  knownSubjectCodes: string[]
): string[] {
  const next = (nextSubjectCode ?? "").trim().toLowerCase();
  if (!next) return currentTags;
  const known = new Set(
    knownSubjectCodes.map((c) => c.trim().toLowerCase()).filter(Boolean)
  );
  const kept = currentTags.filter((t) => {
    const slug = t.trim().toLowerCase();
    return slug === next || !known.has(slug);
  });
  if (!kept.some((t) => t.trim().toLowerCase() === next)) kept.push(next);
  return kept;
}

/**
 * Hai tập tag có KHÁC nhau không — so theo TẬP HỢP, không theo thứ tự (AntD `mode="tags"` giữ đúng
 * thứ tự người dùng gõ, nên so mảng sẽ báo "đổi" cho một thao tác chỉ gỡ-rồi-thêm-lại).
 * Export để unit test.
 */
export function tagSetChanged(current: string[], next: string[]): boolean {
  if (current.length !== next.length) return true;
  const set = new Set(current);
  return next.some((t) => !set.has(t));
}

/**
 * Dòng ở kho/by-lesson là read-model MỎNG, nên khi endpoint detail còn đang tải tuyệt đối không dùng
 * nó để pre-fill (description/maxSubmissions/gradingConfig sẽ thành rỗng giả). Chỉ fallback về dòng
 * mỏng khi request detail đã kết thúc bằng lỗi, để bản Admin cũ vẫn sửa được các field nó thật sự có.
 */
export function resolveChallengeForEditing(
  listRow: ChallengeView | null,
  detail: ChallengeView | undefined,
  detailSettled: boolean
): ChallengeView | null {
  if (detail) return detail;
  return detailSettled ? listRow : null;
}

/**
 * Chỉ hydrate form đúng MỘT lần cho mỗi lượt mở/challenge và phải đợi request detail hiện tại xong.
 * React Query có thể giữ cache cũ trong lúc refetch; dùng ngay cache đó sẽ dựng đề cũ rồi response
 * mới về ghi đè phần mentor vừa gõ.
 */
export function shouldHydrateChallengeForm(
  open: boolean,
  challengeId: string | undefined,
  detailFetching: boolean,
  hydratedChallengeId: string | undefined
): boolean {
  return Boolean(
    open && challengeId && !detailFetching && hydratedChallengeId !== challengeId
  );
}

/**
 * Diff form → PATCH partial (admin-challenge-edit): CHỈ đính field ĐỔI so với giá trị hiện tại của
 * challenge (BE update: null → giữ nguyên). Nhờ so-sánh-đổi này, kể cả khi một field pre-fill thiếu
 * cũng KHÔNG ghi đè: chỉ gửi khi người dùng thực sự đổi.
 * - title: bỏ khoảng trắng thừa; chỉ gửi khi khác & không rỗng (title bắt buộc, tránh xoá trắng).
 * - description: chuẩn hoá null/undefined/"" → "" khi so sánh; gửi "" nếu người dùng xoá mô tả.
 * - free: gửi khi boolean khác cờ hiện tại (original.free absent ⇒ coi như false).
 * Trả {} nếu không có gì đổi (caller khỏi bắn request).
 */
export function buildUpdateChallengePayload(
  original: Pick<ChallengeView, "title" | "description" | "free"> &
    Partial<
      Pick<
        ChallengeView,
        | "subjectId"
        | "type"
        | "submissionMethod"
        | "fileExtension"
        | "seedSql"
        | "gradingConfig"
        | "maxSubmissions"
        | "startsAt"
        | "endsAt"
        | "aiFeedbackLimit"
        | "question"
        | "criteria"
      >
    >,
  values: ChallengeEditFormValues
): UpdateChallengeRequest {
  const patch: UpdateChallengeRequest = {};

  const nextTitle = (values.title ?? "").trim();
  if (nextTitle && nextTitle !== original.title) {
    patch.title = nextTitle;
  }

  const nextDesc = (values.description ?? "").trim();
  const origDesc = (original.description ?? "").trim();
  if (nextDesc !== origDesc) {
    patch.description = nextDesc;
  }

  const origFree = original.free ?? false;
  if (values.free !== origFree) {
    patch.free = values.free;
  }

  // MÔN — ba trạng thái của `original.subjectId`, và trạng thái thứ ba là thứ giữ an toàn:
  //  - chuỗi  = môn đang lưu (biết chắc)     → chỉ đính khi tác giả chọn môn KHÁC;
  //  - null   = biết chắc CHƯA gắn môn        → chọn môn ⇒ đính (đây là đường gắn môn tại chỗ);
  //  - undefined = CHƯA ĐỌC ĐƯỢC môn hiện tại → KHÔNG ĐÍNH GÌ CẢ.
  // `undefined` KHÔNG được coi là "chưa gắn môn": gửi patch khi chưa biết môn cũ là ghi đè MÙ — một
  // thử thách đang gắn đúng CSD201 bị thay bằng môn người sửa đoán, im lặng, không cảnh báo, và
  // người đi backfill cũng không phân biệt nổi bài NULL với bài đã có môn. Xem `resolveCurrentSubjectId`.
  // Bỏ trống ô thì vẫn không gửi gì — PATCH partial coi null là "giữ nguyên", không phải GỠ môn.
  const nextSubjectId = (values.subjectId ?? "").trim();
  if (
    nextSubjectId &&
    original.subjectId !== undefined &&
    nextSubjectId !== (original.subjectId ?? "")
  ) {
    patch.subjectId = nextSubjectId;
  }

  // challenge-testcase-editor §4 / BE challenge-testcase-judge §7 — LỊCH mở → đóng.
  // PATCH là partial: `endsAt: null` nghĩa "GIỮ NGUYÊN", nên GỠ một mốc ĐÃ ĐẶT chỉ có một đường là
  // cờ `clearStartsAt`/`clearEndsAt`. Không có 2 cờ này thì challenge lỡ đặt hạn đóng KHÔNG BAO GIỜ
  // trở lại "không giới hạn" được (phải xoá & tạo lại).
  // `values.range === undefined` ⇒ form không mang control lịch (không đụng) → không đính gì.
  if (values.range !== undefined) {
    const [nextOpen, nextClose] = values.range ?? [null, null];

    if (nextOpen) {
      if (!sameInstant(original.startsAt, nextOpen)) patch.startsAt = nextOpen.toISOString();
    } else if (original.startsAt) {
      patch.clearStartsAt = true; // gỡ mốc mở đã đặt ⇒ mở ngay
    }

    if (nextClose) {
      if (!sameInstant(original.endsAt, nextClose)) patch.endsAt = nextClose.toISOString();
    } else if (!isUnlimitedClose(original.endsAt)) {
      // Chỉ gửi khi ĐANG có hạn đóng thật; sentinel 2999 đã hiện là "không giới hạn" nên bỏ trống ô
      // đóng của nó KHÔNG phải là thay đổi.
      patch.clearEndsAt = true;
    }
  }

  // Số lần nộp tối đa: chỉ đính khi > 0 và KHÁC giá trị hiện tại (partial-diff như các field khác).
  if (
    typeof values.maxSubmissions === "number" &&
    values.maxSubmissions > 0 &&
    values.maxSubmissions !== original.maxSubmissions
  ) {
    patch.maxSubmissions = values.maxSubmissions;
  }

  // admin-challenge-unified-form §④: chỉ CODE (bài NỘP) mới sửa cách nộp + đuôi file; type khác bỏ qua
  // để không gửi field vô nghĩa. Partial-diff: chỉ đính khi ĐỔI so với giá trị hiện tại.
  if (original.type === "CODE") {
    // `undefined` cũng có thể nghĩa là form rút gọn/fallback không render control này. Không được
    // suy nó thành "xoá cách nộp/đuôi file", nếu không một cú sửa title sẽ làm mất config ẩn.
    if (values.submissionMethod !== undefined) {
      if (values.submissionMethod !== original.submissionMethod) {
        patch.submissionMethod = values.submissionMethod;
      }
      // fileExtension chỉ ý nghĩa khi cho phép nộp file; nếu chuyển sang chỉ GitHub thì xoá whitelist.
      const nextExt = allowsFile(values.submissionMethod)
        ? (values.fileExtension ?? "").trim()
        : "";
      const origExt = (original.fileExtension ?? "").trim();
      if (nextExt !== origExt) {
        patch.fileExtension = nextExt;
      }
    }

    // code-sandbox-assignment §2C: seedSql chỉ có nghĩa khi whitelist đuôi file MỚI chứa .sql. Flat
    // field — BE merge vào grading_config JSON (như fileExtension). Partial-diff: chỉ đính khi có seed
    // mới (người dùng nạp file) & khác seed cũ; bỏ trống ⇒ giữ nguyên seed hiện tại.
    if (allowsFile(values.submissionMethod) && acceptsSqlExtension(values.fileExtension)) {
      const nextSeed = (values.seedSql ?? "").trim();
      const origSeed = resolveOriginalSeedSql(original);
      if (nextSeed && nextSeed !== origSeed) {
        patch.seedSql = nextSeed;
      }
    }

    // algo-testcase-starter §3: sườn code (map ngôn ngữ→code) — flat field, BE merge vào grading_config
    // như seedSql. KHÔNG gate theo cách nộp (áp cho mọi bài CODE, chủ yếu test-case thuật toán).
    // Partial-diff theo map: chỉ đính khi map MỚI khác map cũ (thêm/sửa/xoá ngôn ngữ). Trùng ⇒ không đính.
    if (values.starterCode !== undefined) {
      const nextStarter = buildStarterCodeMap(values.starterCode) ?? {};
      const origStarter = resolveOriginalStarterCode(original);
      if (!starterCodeMapsEqual(nextStarter, origStarter)) {
        patch.starterCode = nextStarter;
      }
    }

    // challenge-testcase-sample-ui §3.1: số lần AI nhận xét — chỉ bài CODE chấm bằng TEST CASE (bài
    // NỘP có cap riêng ở BE). Kẹp 1..5 rồi so với giá trị hiện tại (chưa đặt ⇒ mặc định 1) và chỉ
    // đính khi ĐỔI, đúng nghĩa partial như mọi field khác.
    if (supportsAiFeedbackLimit(original) && values.aiFeedbackLimit !== undefined) {
      const nextLimit = clampAiFeedbackLimit(values.aiFeedbackLimit);
      const origLimit = resolveOriginalAiFeedbackLimit(original) ?? AI_FEEDBACK_LIMIT_DEFAULT;
      if (nextLimit !== origLimit) {
        patch.aiFeedbackLimit = nextLimit;
      }
    }
  }

  // HSF/PRN thực tế chỉ để summary ngắn ở description; toàn bộ đề + rubric nằm ở
  // grading_config.question/criteria. Gửi field phẳng để BE merge từng key, không replace blob làm
  // mất fileExtension/seedSql/starterCode và các key tương lai.
  const editsAuthoringText =
    original.type === "ESSAY" ||
    (original.type === "CODE" && Boolean(values.submissionMethod ?? original.submissionMethod));
  if (editsAuthoringText) {
    const nextQuestion = values.question?.trim();
    const originalQuestion = resolveOriginalAuthoringText(original, "question");
    if (
      nextQuestion !== undefined &&
      nextQuestion !== originalQuestion &&
      // Project đang có nội dung đầy đủ không được phát sinh PATCH xoá trắng. Form cũng validate,
      // guard builder này là lớp cuối nếu caller khác gọi hàm thuần trực tiếp.
      (!originalQuestion || Boolean(nextQuestion))
    ) {
      patch.question = nextQuestion;
    }

    const nextCriteria = values.criteria?.trim();
    const originalCriteria = resolveOriginalAuthoringText(original, "criteria");
    if (
      nextCriteria !== undefined &&
      nextCriteria !== originalCriteria &&
      (!originalCriteria || Boolean(nextCriteria))
    ) {
      patch.criteria = nextCriteria;
    }
  }

  return patch;
}

interface ChallengeEditModalProps {
  open: boolean;
  /** Challenge đang sửa (nguồn pre-fill: title/description/free THẬT từ GET /challenges). */
  challenge: ChallengeView | null;
  disabled?: boolean;
  onClose: () => void;
  /** Gọi sau khi lưu thành công (caller refetch danh sách để cờ/meta cập nhật ngay). */
  onSaved?: () => void;
}

/**
 * Sửa 1 challenge per-lesson (admin-challenge-edit): pre-fill title/description/cờ học thử từ hàng
 * hiện tại rồi PATCH /admin/challenges/{id} theo partial-diff. Chủ đích chính: sửa cờ `free` khi tạo
 * nhầm (đánh dấu học thử sai) mà không phải xoá & tạo lại. KHÔNG đụng luồng tạo
 * (ChallengeWizardDrawer).
 *
 * challenge-testcase-editor §2.2: thử thách CODE nay có lối vào sửa TEST CASE ngay từ đây
 * (`TestCaseManagerDrawer`) — trước change này test case là ghi-một-lần lúc tạo. Project CODE và
 * ESSAY đồng thời hydrate/sửa được question + criteria đầy đủ; câu hỏi MCQ vẫn theo editor riêng.
 */
export function ChallengeEditModal({
  open,
  challenge,
  disabled,
  onClose,
  onSaved,
}: ChallengeEditModalProps) {
  const [form] = Form.useForm<ChallengeEditFormValues>();
  const selectedSubmissionMethod = Form.useWatch("submissionMethod", form);
  const update = useUpdateChallenge();
  const [testCasesOpen, setTestCasesOpen] = useState(false);
  const [mcqQuestionsOpen, setMcqQuestionsOpen] = useState(false);
  const [hydratedChallengeId, setHydratedChallengeId] = useState<string>();
  const [subjectHydratedChallengeId, setSubjectHydratedChallengeId] = useState<string>();
  const detailQuery = useAdminChallengeDetail(challenge?.id, open);
  const editChallenge = resolveChallengeForEditing(
    challenge,
    detailQuery.data,
    detailQuery.isFetched
  );
  // admin-challenge-bank-console §3.3: tag của thử thách sửa được ngay tại đây.
  // `PUT /tags` là REPLACE-SET, nên chỉ được gửi khi ĐÃ đọc thành công tập tag hiện tại — nếu không,
  // một lần GET lỗi (mất mạng, thiếu quyền đọc) sẽ biến cú bấm "Lưu" thành lệnh xoá sạch tag.
  const tagsQuery = useChallengeTags(challenge?.id, open);
  const setTags = useSetChallengeTags();
  const currentTags = (tagsQuery.data ?? []).map((t) => t.slug);

  // MÔN HIỆN TẠI phải hỏi KHO, vì dòng danh sách nuôi prop `challenge` không mang `subjectId`
  // (xem `resolveCurrentSubjectId`). `q` = tiêu đề để trang đầu chắc chắn chứa đúng dòng này (BE lọc
  // `q` theo title), rồi khớp lại theo id ở client — không tin vào thứ tự/độ dài trang.
  // `useChallengeBank` đã đặt `retry: false`: 403 (không quyền kho) là câu trả lời dứt khoát, thử
  // lại chỉ kéo dài trạng thái "chưa biết".
  const bankRow = useChallengeBank(
    {
      courseId: editChallenge?.courseId ?? challenge?.courseId ?? undefined,
      q: editChallenge?.title ?? challenge?.title,
      page: 1,
      pageSize: 100,
    },
    open && Boolean(challenge)
  );
  const currentSubjectId = !detailQuery.isFetching && detailQuery.data
    ? detailQuery.data.subjectId ?? null
    : detailQuery.isError
      ? resolveCurrentSubjectId(bankRow.data, challenge?.id)
      : undefined;
  /** Đã biết chắc môn hiện tại chưa (kể cả biết chắc là "chưa gắn môn"). */
  const subjectKnown = currentSubjectId !== undefined;

  // Pre-fill từ GIÁ TRỊ HIỆN TẠI của challenge mỗi lần mở (free THẬT từ ChallengeView.free — không
  // hardcode default kẻo lưu đè). free absent (response cũ đã cache) → coi như false.
  useEffect(() => {
    if (
      editChallenge &&
      shouldHydrateChallengeForm(
        open,
        editChallenge.id,
        detailQuery.isFetching,
        hydratedChallengeId
      )
    ) {
      form.setFieldsValue({
        title: editChallenge.title,
        description: editChallenge.description ?? "",
        free: editChallenge.free ?? false,
        // MÔN cố tình để TRỐNG ở đây: dòng danh sách KHÔNG mang `subjectId` (xem
        // `resolveCurrentSubjectId`), nên `challenge.subjectId` là undefined với mọi hàng — đọc nó ra
        // là dựng một ô trống giả vờ nói "bài này chưa có môn". Giá trị thật đổ vào ở effect riêng
        // bên dưới, khi lượt hỏi kho trả về.
        subjectId: undefined,
        maxSubmissions: editChallenge.maxSubmissions,
        // challenge-testcase-editor §4: lịch THẬT của challenge; vế đóng vắng/sentinel ⇒ ô trống
        // ("Không giới hạn") để tác giả thấy đúng trạng thái và xoá được hạn đã đặt.
        range: challengeScheduleToRange(editChallenge),
        // CODE bài NỘP: pre-fill cách nộp THẬT từ challenge. KHÔNG mặc định "GITHUB" khi challenge
        // chưa có: `submissionMethod` VẮNG chính là dấu hiệu bài CODE chấm-bằng-TEST-CASE. Pre-fill
        // "GITHUB" khiến mọi lần sửa (kể cả chỉ đổi tiêu đề) gửi kèm submissionMethod="GITHUB" →
        // BE ghi vào → điều kiện chấm tự động (đòi submission_method IS NULL) không còn đúng ⇒ bài
        // LẶNG LẼ mất chế độ chấm bằng test case.
        submissionMethod: editChallenge.submissionMethod ?? undefined,
        fileExtension: editChallenge.fileExtension ?? "",
        // code-sandbox-assignment §2C: pre-fill seed .sql hiện tại để round-trip (không bắt nạp lại).
        seedSql: resolveOriginalSeedSql(editChallenge),
        // algo-testcase-starter §3: pre-fill sườn code hiện tại (từ gradingConfig.starterCode) → rows.
        starterCode: starterCodeMapToRows(resolveOriginalStarterCode(editChallenge)),
        // challenge-testcase-sample-ui §3: số lần AI nhận xét hiện tại (chưa đặt ⇒ mặc định 1).
        aiFeedbackLimit:
          resolveOriginalAiFeedbackLimit(editChallenge) ?? AI_FEEDBACK_LIMIT_DEFAULT,
        question: resolveOriginalAuthoringText(editChallenge, "question"),
        criteria: resolveOriginalAuthoringText(editChallenge, "criteria"),
      });
      setHydratedChallengeId(editChallenge.id);
    }
  }, [open, editChallenge, detailQuery.isFetching, hydratedChallengeId, form]);

  // Mỗi lần đóng là kết thúc một phiên soạn. Lần mở kế tiếp phải đợi detail refetch rồi mới hydrate,
  // không được xem cache của phiên trước là dữ liệu mới.
  useEffect(() => {
    if (!open) {
      form.resetFields();
      setHydratedChallengeId(undefined);
      setSubjectHydratedChallengeId(undefined);
    }
  }, [open, form]);

  // Tag nạp bằng một request riêng nên về SAU pre-fill ở trên; đổ vào form khi có (và mỗi lần server
  // trả tập mới) thay vì nhét vào effect kia.
  useEffect(() => {
    if (open && tagsQuery.data) {
      form.setFieldValue(
        "tags",
        tagsQuery.data.map((t) => t.slug)
      );
    }
  }, [open, tagsQuery.data, form]);

  // MÔN cũng về sau (lượt hỏi kho riêng) — đổ vào form đúng lúc BIẾT được, kể cả khi biết là "chưa
  // gắn môn" (ô trống, nhưng lần này là trống THẬT). Chưa biết ⇒ không đụng vào form.
  useEffect(() => {
    if (open && subjectKnown && challenge?.id !== subjectHydratedChallengeId) {
      form.setFieldValue("subjectId", currentSubjectId ?? undefined);
      setSubjectHydratedChallengeId(challenge?.id);
    }
  }, [open, subjectKnown, currentSubjectId, challenge?.id, subjectHydratedChallengeId, form]);

  /**
   * Đổi môn ⇒ kéo tag MÃ MÔN đi theo NGAY TRÊN MÀN HÌNH (người sửa thấy tag đổi trước khi bấm Lưu),
   * rồi lệnh `PUT /{id}/tags` sẵn có mang nó đi. Chỉ động vào tag khi ĐÃ đọc được tập tag hiện tại —
   * `PUT` là replace-set, ghi mù sẽ xoá sạch tag đang có.
   */
  // ĐÃ GỠ đồng bộ tag tự động khi đổi môn — CỐ Ý, đừng nối lại.
  //
  // Nó từng đổi tập tag ngay trên form, nên bấm Lưu là kéo theo `PUT /{id}/tags`. Ở BE,
  // `ChallengeBankService.replaceTags` chạy `applyPeAutoPublish` VÔ ĐIỀU KIỆN mỗi lượt gọi: một đề
  // PE đang DRAFT (vừa bị CTV từ chối, vẫn giữ tag `pe`) sẽ bị đặt lại thành PUBLISHED hoặc
  // PENDING_APPROVAL, xoá luôn lý do từ chối và phát event duyệt. Tức thao tác "sửa môn cho đúng"
  // âm thầm ĐẨY BÀI RA CHO HỌC VIÊN — không một dòng nào trên màn hình nói điều đó.
  //
  // Tag mã môn nay do BE tự gộp khi PATCH đổi subject_id, nên FE làm thêm ở đây vừa thừa vừa là
  // nguồn sự thật thứ hai. Người soạn vẫn sửa tag bằng tay qua ChallengeTagPicker ngay bên dưới.

  const handleFinish = async (values: ChallengeEditFormValues) => {
    if (
      !challenge ||
      !editChallenge ||
      detailQuery.isFetching ||
      hydratedChallengeId !== challenge.id
    ) return;
    // Môn hiện tại KHÔNG lấy từ dòng danh sách (không có field đó) mà từ lượt hỏi kho; `undefined`
    // ⇒ chưa biết ⇒ `buildUpdateChallengePayload` không đính subjectId (chặn ghi đè mù).
    const patch = buildUpdateChallengePayload(
      { ...editChallenge, subjectId: currentSubjectId },
      values
    );
    const nextTags = (values.tags ?? []).map((t) => t.trim()).filter(Boolean);
    // Chỉ đụng tới tag khi ĐỌC ĐƯỢC tập hiện tại và tập mới thực sự khác (xem chú thích ở trên).
    const tagsDirty = tagsQuery.isSuccess && tagSetChanged(currentTags, nextTags);

    if (Object.keys(patch).length === 0 && !tagsDirty) {
      message.info("Chưa có thay đổi nào để lưu");
      onClose();
      return;
    }

    try {
      if (Object.keys(patch).length > 0) {
        await update.mutateAsync({ id: challenge.id, body: patch });
      }
      if (tagsDirty) {
        await setTags.mutateAsync({ id: challenge.id, tags: nextTags });
      }
      message.success("Đã cập nhật thử thách");
      onSaved?.();
      onClose();
    } catch {
      // Cả hai hook đã bắn notification bản địa hoá; giữ modal mở để sửa và thử lại.
    }
  };

  const isExistingProject = Boolean(
    editChallenge?.type === "CODE" && editChallenge.submissionMethod
  );
  const isConvertingSandboxToProject = isSandboxToProjectConversion(
    editChallenge,
    selectedSubmissionMethod
  );
  const authoringRequirements = authoringTextRequirements(
    editChallenge,
    selectedSubmissionMethod
  );
  const existingProjectMissingText = Boolean(
    isExistingProject &&
    editChallenge &&
    (!resolveOriginalAuthoringText(editChallenge, "question") ||
      !resolveOriginalAuthoringText(editChallenge, "criteria"))
  );
  const renderAuthoringFields = () => (
    <>
      <Divider orientation="left">Đề bài và tiêu chí AI chấm</Divider>
      <Alert
        type="info"
        showIcon
        message="Đây mới là nội dung đầy đủ gửi cho FrosTES chấm"
        description="Mô tả ngắn phía trên chỉ dùng cho danh sách. Hai ô dưới được tải từ dữ liệu chấm đầy đủ và lưu riêng, không làm mất cấu hình GitHub/tệp."
        style={{ marginBottom: 16 }}
      />
      {existingProjectMissingText && (
        <Alert
          type="warning"
          showIcon
          message="Bài project cũ đang thiếu đề đầy đủ hoặc tiêu chí chấm"
          description="Bạn vẫn có thể sửa thông tin khác. Nên bổ sung phần còn thiếu trước lần chấm AI tiếp theo."
          style={{ marginBottom: 16 }}
        />
      )}
      <Form.Item
        name="question"
        label="Đề bài đầy đủ"
        tooltip="Yêu cầu chi tiết mà AI dùng để đối chiếu với source/bài làm của học viên."
        rules={
          authoringRequirements.question
            ? [{
                required: true,
                whitespace: true,
                message: "Đề bài đang có/đang chuyển Project nên không được để trống",
              }]
            : undefined
        }
      >
        <ChallengeDescriptionEditor height={360} />
      </Form.Item>
      <Form.Item
        name="criteria"
        label="Tiêu chí / rubric AI chấm"
        tooltip="Nêu rõ các mục cần đạt, trọng số/thang điểm và điều kiện bị trừ điểm."
        rules={
          authoringRequirements.criteria
            ? [{
                required: true,
                whitespace: true,
                message: "Tiêu chí đang có/đang chuyển Project nên không được để trống",
              }]
            : undefined
        }
      >
        <Input.TextArea
          autoSize={{ minRows: 6, maxRows: 14 }}
          placeholder="Ví dụ: Kiến trúc 3đ; đúng nghiệp vụ 4đ; chất lượng code 2đ; xử lý lỗi 1đ…"
        />
      </Form.Item>
    </>
  );

  return (
    <>
    <Modal
      title="Sửa thử thách"
      open={open}
      width={900}
      onOk={() => form.submit()}
      okText="Lưu"
      cancelText="Huỷ"
      okButtonProps={{
        loading: update.isPending || setTags.isPending,
        disabled:
          disabled ||
          detailQuery.isFetching ||
          !editChallenge ||
          hydratedChallengeId !== challenge?.id,
      }}
      confirmLoading={update.isPending || setTags.isPending}
      onCancel={onClose}
      destroyOnClose
    >
      {disabled && (
        <Alert
          type="warning"
          message="Chế độ chỉ đọc — không có quyền sửa thử thách."
          style={{ marginBottom: 16 }}
        />
      )}
      {detailQuery.isError && (
        <Alert
          type="warning"
          showIcon
          message="Không tải được toàn bộ đề bài"
          description="Đang dùng dữ liệu rút gọn từ danh sách. Các trường chưa hiện sẽ không bị ghi đè; hãy bấm Huỷ và mở lại trước khi sửa nội dung dài."
          style={{ marginBottom: 16 }}
        />
      )}
      <Spin spinning={detailQuery.isFetching} tip="Đang tải đầy đủ đề bài…">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        disabled={disabled || detailQuery.isFetching || hydratedChallengeId !== challenge?.id}
      >
        <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: "Nhập tiêu đề" }]}>
          <Input placeholder="Tiêu đề thử thách" />
        </Form.Item>
        <Form.Item
          name="description"
          label="Mô tả ngắn (hiển thị ở danh sách)"
          tooltip="Đây là phần tóm tắt trên thẻ/danh sách, không phải toàn bộ đề AI dùng để chấm."
        >
          <ChallengeDescriptionEditor height={320} />
        </Form.Item>
        {/* MÔN — sửa được tại chỗ để gắn môn cho thử thách cũ (`subject_id = NULL`), thứ đang làm
            trang Luyện tập của môn rỗng rồi đổ nhầm đề môn khác vào. `allowClear={false}`: PATCH
            partial không GỠ được môn (null = giữ nguyên), nên nút xoá sẽ là control giả.
            KHOÁ ô khi CHƯA đọc được môn hiện tại: một ô trống bấm được ở trạng thái đó mời người sửa
            ghi đè lên một môn có thể đang đúng — xem `resolveCurrentSubjectId`. */}
        <Form.Item
          name="subjectId"
          label="Môn học"
          tooltip="Thử thách thuộc về một môn (workplace). Chưa gắn môn thì không lọc được theo môn."
          extra={
            bankRow.isLoading
              ? "Đang đọc môn hiện tại của thử thách…"
              : subjectKnown
                ? currentSubjectId === null
                  ? "Thử thách này CHƯA gắn môn — chọn môn để nó hiện ở trang Luyện tập của môn. Tag mã môn được cập nhật theo."
                  : "Đổi môn sẽ ghi đè môn đang lưu, và tag mã môn được cập nhật theo."
                : "Không đọc được môn hiện tại của thử thách (thiếu quyền đọc kho, hoặc thử thách chưa thuộc khoá nào) — ô bị khoá để không ghi đè nhầm lên môn đang đúng. Sửa môn ở console Kho thử thách."
          }
        >
          <SubjectSelect
            allowClear={false}
            disabled={disabled || !subjectKnown}
            style={{ width: "100%" }}
          />
        </Form.Item>
        <Form.Item
          name="free"
          label="Cho làm miễn phí (học thử)"
          valuePropName="checked"
          tooltip="Học viên học thử / chưa mua vẫn làm được thử thách này khi bài học đang mở (miễn phí/trial)."
        >
          <Switch />
        </Form.Item>
        {/* admin-challenge-bank-console §3.3: tag (phân loại kho — đề PE dùng `PE` + mã môn). Lưu
            bằng lệnh riêng `PUT /admin/challenges/{id}/tags` khi bấm Lưu, và CHỈ khi đọc được tập
            tag hiện tại (replace-set: gửi mù sẽ xoá sạch tag đang có). */}
        <Form.Item
          name="tags"
          label="Tag"
          tooltip="Phân loại thử thách trong kho. Đề PE quy ước gắn PE + mã môn (vd MAE101)."
          extra={
            tagsQuery.isError
              ? "Không đọc được tag hiện tại — phần tag sẽ không được lưu ở lần bấm này."
              : undefined
          }
        >
          <ChallengeTagPicker
            style={{ width: "100%" }}
            disabled={disabled || tagsQuery.isLoading || tagsQuery.isError}
          />
        </Form.Item>
        <Form.Item
          name="maxSubmissions"
          label="Số lần nộp tối đa"
          tooltip="Số lần học viên được nộp bài cho thử thách này."
        >
          <InputNumber min={1} style={{ width: 160 }} />
        </Form.Item>

        {/* challenge-testcase-editor §4: sửa LỊCH sau khi tạo. Bỏ trống vế ĐÓNG = mở vô hạn — FE gửi
            `clearEndsAt: true` vì PATCH null nghĩa là "giữ nguyên" (BE challenge-testcase-judge §7).
            Trước đây modal không có control lịch nên challenge lỡ đặt hạn chỉ còn cách xoá & tạo lại. */}
        <Form.Item
          name="range"
          label="Thời gian mở → đóng"
          tooltip={`Bỏ trống ô ĐÓNG ⇒ ${NO_CLOSE_LABEL} (thử thách không tự đóng). Bỏ trống ô MỞ ⇒ ${OPEN_NOW_LABEL}.`}
          extra={
            editChallenge
              ? `Đang áp dụng: ${formatChallengeSchedule(editChallenge.startsAt, editChallenge.endsAt)}`
              : undefined
          }
        >
          <DatePicker.RangePicker
            showTime
            allowEmpty={[true, true]}
            placeholder={[OPEN_NOW_LABEL, NO_CLOSE_LABEL]}
            style={{ width: "100%" }}
          />
        </Form.Item>

        {editChallenge?.type === "ESSAY" && renderAuthoringFields()}

        {editChallenge?.type === "MULTIPLE_CHOICE" && (
          <>
            <Divider orientation="left">Câu hỏi trắc nghiệm</Divider>
            <Space direction="vertical" size={4} style={{ marginBottom: 16 }}>
              <Button
                icon={<EditOutlined />}
                onClick={() => setMcqQuestionsOpen(true)}
                disabled={!challenge}
              >
                Sửa câu hỏi &amp; đáp án đúng
              </Button>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Xem và sửa nội dung, lựa chọn đúng, lời giải và điểm của từng câu.
              </Typography.Text>
            </Space>
          </>
        )}

        {/* admin-challenge-unified-form §④: challenge CODE (bài NỘP) sửa nhanh cách nộp + đuôi file. */}
        {editChallenge?.type === "CODE" && (
          <>
            <Form.Item
              name="submissionMethod"
              label="Cách nộp bài"
              tooltip="Không có cách nộp = Code Sandbox chấm test case. Chọn một cách nộp = Project do AI đọc source và chấm."
              extra={
                editChallenge.submissionMethod
                  ? "Bài Project — FrosTES AI đọc repository/tệp project để chấm."
                  : "Hiện tại: Code Sandbox — học viên viết code trực tiếp và hệ thống chấm test case."
              }
            >
              <Radio.Group>
                <Radio.Button value="GITHUB">Project — GitHub</Radio.Button>
                <Radio.Button value="FILE">Project — tệp ZIP</Radio.Button>
                <Radio.Button value="BOTH">Project — GitHub hoặc ZIP</Radio.Button>
              </Radio.Group>
            </Form.Item>
            {/* Bài CODE KHÔNG có cách nộp = bài chấm bằng TEST CASE. Đặt cách nộp sẽ biến nó thành
                bài nộp (AI chấm điểm) và test case thôi chấm — hệ quả lớn, phải nói trước chứ không
                để tác giả phát hiện khi điểm học viên đã đổi. */}
            {!editChallenge?.submissionMethod && (
              <Form.Item
                noStyle
                shouldUpdate={(prev, cur) => prev.submissionMethod !== cur.submissionMethod}
              >
                {({ getFieldValue }) =>
                  getFieldValue("submissionMethod") ? (
                    <Alert
                      type="warning"
                      showIcon
                      style={{ marginBottom: 16 }}
                      message="Chuyển sang bài nộp — test case sẽ KHÔNG còn chấm điểm"
                      description={
                        <>
                          Thử thách này đang chấm tự động bằng test case. Chọn cách nộp sẽ đổi nó
                          thành Project và điểm do AI chấm.
                          <Button
                            type="link"
                            size="small"
                            onClick={() => form.setFieldValue("submissionMethod", undefined)}
                          >
                            Giữ Code Sandbox
                          </Button>
                        </>
                      }
                    />
                  ) : null
                }
              </Form.Item>
            )}

            {/* Đề/rubric chỉ thuộc Project CODE. Sandbox cũ thường không có hai field này và phải
                tiếp tục sửa title/test case được. Riêng lúc CHUYỂN sandbox → project thì bắt nhập cả
                hai, tránh đổi grading route sang AI với prompt rỗng. */}
            {selectedSubmissionMethod &&
              renderAuthoringFields()}
            <Form.Item
              noStyle
              shouldUpdate={(prev, cur) =>
                prev.submissionMethod !== cur.submissionMethod ||
                prev.fileExtension !== cur.fileExtension
              }
            >
              {({ getFieldValue }) =>
                allowsFile(getFieldValue("submissionMethod") as SubmissionMethod) ? (
                  <>
                    <Form.Item
                      name="fileExtension"
                      label="Đuôi file nhận (whitelist)"
                      tooltip="Danh sách đuôi file được phép nộp, ngăn cách bởi dấu phẩy."
                      rules={
                        isConvertingSandboxToProject
                          ? [{ required: true, message: "Nhập ít nhất một đuôi file, ví dụ .zip" }]
                          : undefined
                      }
                    >
                      <Input placeholder=".zip,.sql,.py" />
                    </Form.Item>
                    {/* code-sandbox-assignment §2C: whitelist chứa .sql ⇒ có seed dataset. Nạp lại file
                        .sql để THAY seed; đọc client-side (FileReader) → BE merge vào grading_config. Bỏ
                        trống ⇒ giữ seed hiện tại (partial-diff chỉ gửi khi seed mới KHÁC seed cũ).
                        KHÔNG hard-required ở đường SỬA: challenge .sql migrate (V282–V284) có thể chưa có
                        seed → bắt buộc sẽ chặn cả sửa tiêu đề/mô tả không liên quan. Bắt buộc seed chỉ ở
                        wizard TẠO (ChallengeWizardDrawer). */}
                    {acceptsSqlExtension(getFieldValue("fileExtension") as string | undefined) && (
                      <Form.Item
                        name="seedSql"
                        label="File .sql seed"
                        tooltip="seed .sql sẽ được chạy tạo dữ liệu trước mỗi lần học viên chạy query (seed tươi mỗi lần)."
                        extra="Để trống nếu giữ seed hiện tại; tải lên file .sql mới để thay dataset."
                      >
                        <SeedSqlUpload />
                      </Form.Item>
                    )}
                  </>
                ) : null
              }
            </Form.Item>

            {/* Sandbox và Project là hai grading route loại trừ nhau. Khi đã chọn Project, ẩn toàn
                bộ tool sandbox để mentor không tưởng test case/starter code vẫn tham gia chấm AI. */}
            {!selectedSubmissionMethod && (
              <>
                {/* challenge-testcase-sample-ui §3.2: "Số lần AI nhận xét" — CHỈ CODE sandbox. */}
                {supportsAiFeedbackLimit(editChallenge) && (
                  <Form.Item
                    name="aiFeedbackLimit"
                    label="Số lần AI nhận xét"
                    tooltip={AI_FEEDBACK_LIMIT_HINT}
                    extra={`Mỗi học viên được ${AI_FEEDBACK_LIMIT_MIN}–${AI_FEEDBACK_LIMIT_MAX} lượt trên thử thách này. ${AI_FEEDBACK_LIMIT_HINT}`}
                  >
                    <InputNumber
                      min={AI_FEEDBACK_LIMIT_MIN}
                      max={AI_FEEDBACK_LIMIT_MAX}
                      placeholder={String(AI_FEEDBACK_LIMIT_DEFAULT)}
                      style={{ width: 160 }}
                    />
                  </Form.Item>
                )}

                {/* algo-testcase-starter §3: sườn code per-ngôn-ngữ, chỉ dành cho sandbox. */}
                <Divider orientation="left">Sườn code theo ngôn ngữ (Sandbox)</Divider>
                <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
                  Sườn để học viên bắt đầu (import + khai báo hàm + khung đọc I/O) — learner-safe,
                  KHÔNG phải đáp án. Để trống nếu bài này không dùng sườn.
                </Typography.Paragraph>
                <StarterCodeEditor />

                {/* challenge-testcase-editor §2.2: lối vào sửa TEST CASE sau khi tạo. */}
                <Divider orientation="left">Test case (Code Sandbox)</Divider>
                <Space direction="vertical" size={4} style={{ marginBottom: 16 }}>
                  <Button
                    icon={<ExperimentOutlined />}
                    onClick={() => setTestCasesOpen(true)}
                    disabled={!challenge}
                  >
                    Sửa test case
                  </Button>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Thêm / sửa / xoá test case, đặt giới hạn thời gian &amp; bộ nhớ từng case, hoặc
                    nhập hàng loạt từ tệp .zip.
                  </Typography.Text>
                </Space>
              </>
            )}
          </>
        )}

        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Ở đây chỉnh tiêu đề, mô tả, cờ học thử
          {editChallenge?.type === "CODE" ? ", cách nộp bài, đề AI và test case" : ""}
          {editChallenge?.type === "MULTIPLE_CHOICE" ? ", câu hỏi và đáp án trắc nghiệm" : ""}.
        </Typography.Text>
      </Form>
      </Spin>
    </Modal>

    <TestCaseManagerDrawer
      open={testCasesOpen}
      challenge={editChallenge}
      disabled={disabled}
      onClose={() => setTestCasesOpen(false)}
    />
    <McqQuestionManagerDrawer
      open={mcqQuestionsOpen}
      challenge={editChallenge}
      disabled={disabled}
      onClose={() => setMcqQuestionsOpen(false)}
      onSaved={onSaved}
    />
    </>
  );
}
