import { useEffect, useState } from "react";
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
  Space,
  Switch,
  Typography,
  message,
} from "antd";
import { ExperimentOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import { useUpdateChallenge } from "../api/exercises.api";
import {
  formatChallengeSchedule,
  isUnlimitedClose,
  NO_CLOSE_LABEL,
  OPEN_NOW_LABEL,
} from "../challengeSchedule";
import type { ChallengeView, SubmissionMethod, UpdateChallengeRequest } from "../types";
import {
  acceptsSqlExtension,
  buildStarterCodeMap,
  SeedSqlUpload,
  StarterCodeEditor,
  starterCodeMapToRows,
  type StarterCodeRow,
} from "./ChallengeWizardDrawer";
import { TestCaseManagerDrawer } from "./TestCaseManagerDrawer";

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
  /** admin-challenge-unified-form §④: chỉ có ý nghĩa khi challenge.type === "CODE" (bài NỘP). */
  submissionMethod?: SubmissionMethod;
  fileExtension?: string;
  /** code-sandbox-assignment §2C: nội dung .sql seed (chỉ khi whitelist đuôi file chứa .sql). */
  seedSql?: string;
  /** algo-testcase-starter §3: sườn code per-ngôn-ngữ (rows) cho challenge CODE test-case. */
  starterCode?: StarterCodeRow[];
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
        | "type"
        | "submissionMethod"
        | "fileExtension"
        | "seedSql"
        | "gradingConfig"
        | "maxSubmissions"
        | "startsAt"
        | "endsAt"
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
    if (values.submissionMethod && values.submissionMethod !== original.submissionMethod) {
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
    const nextStarter = buildStarterCodeMap(values.starterCode) ?? {};
    const origStarter = resolveOriginalStarterCode(original);
    if (!starterCodeMapsEqual(nextStarter, origStarter)) {
      patch.starterCode = nextStarter;
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
 * (`TestCaseManagerDrawer`) — trước change này test case là ghi-một-lần lúc tạo. Câu hỏi MCQ và
 * rubric thì vẫn chưa sửa được ở đây (follow-up riêng).
 */
export function ChallengeEditModal({
  open,
  challenge,
  disabled,
  onClose,
  onSaved,
}: ChallengeEditModalProps) {
  const [form] = Form.useForm<ChallengeEditFormValues>();
  const update = useUpdateChallenge();
  const [testCasesOpen, setTestCasesOpen] = useState(false);

  // Pre-fill từ GIÁ TRỊ HIỆN TẠI của challenge mỗi lần mở (free THẬT từ ChallengeView.free — không
  // hardcode default kẻo lưu đè). free absent (response cũ đã cache) → coi như false.
  useEffect(() => {
    if (open && challenge) {
      form.setFieldsValue({
        title: challenge.title,
        description: challenge.description ?? "",
        free: challenge.free ?? false,
        maxSubmissions: challenge.maxSubmissions,
        // challenge-testcase-editor §4: lịch THẬT của challenge; vế đóng vắng/sentinel ⇒ ô trống
        // ("Không giới hạn") để tác giả thấy đúng trạng thái và xoá được hạn đã đặt.
        range: challengeScheduleToRange(challenge),
        // CODE bài NỘP: pre-fill cách nộp + đuôi file THẬT từ challenge (absent → mặc định GITHUB/"").
        submissionMethod: challenge.submissionMethod ?? "GITHUB",
        fileExtension: challenge.fileExtension ?? "",
        // code-sandbox-assignment §2C: pre-fill seed .sql hiện tại để round-trip (không bắt nạp lại).
        seedSql: resolveOriginalSeedSql(challenge),
        // algo-testcase-starter §3: pre-fill sườn code hiện tại (từ gradingConfig.starterCode) → rows.
        starterCode: starterCodeMapToRows(resolveOriginalStarterCode(challenge)),
      });
    }
  }, [open, challenge, form]);

  const handleFinish = (values: ChallengeEditFormValues) => {
    if (!challenge) return;
    const patch = buildUpdateChallengePayload(challenge, values);
    if (Object.keys(patch).length === 0) {
      message.info("Chưa có thay đổi nào để lưu");
      onClose();
      return;
    }
    update.mutate(
      { id: challenge.id, body: patch },
      {
        onSuccess: () => {
          message.success("Đã cập nhật thử thách");
          onSaved?.();
          onClose();
        },
        onError: handleAdminMutationError,
      }
    );
  };

  return (
    <>
    <Modal
      title="Sửa thử thách"
      open={open}
      onOk={() => form.submit()}
      okText="Lưu"
      cancelText="Huỷ"
      okButtonProps={{ loading: update.isPending, disabled }}
      confirmLoading={update.isPending}
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
      <Form form={form} layout="vertical" onFinish={handleFinish} disabled={disabled}>
        <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: "Nhập tiêu đề" }]}>
          <Input placeholder="Tiêu đề thử thách" />
        </Form.Item>
        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={3} placeholder="Mô tả ngắn (có thể để trống)" />
        </Form.Item>
        <Form.Item
          name="free"
          label="Cho làm miễn phí (học thử)"
          valuePropName="checked"
          tooltip="Học viên học thử / chưa mua vẫn làm được thử thách này khi bài học đang mở (miễn phí/trial)."
        >
          <Switch />
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
            challenge
              ? `Đang áp dụng: ${formatChallengeSchedule(challenge.startsAt, challenge.endsAt)}`
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

        {/* admin-challenge-unified-form §④: challenge CODE (bài NỘP) sửa nhanh cách nộp + đuôi file. */}
        {challenge?.type === "CODE" && (
          <>
            <Form.Item
              name="submissionMethod"
              label="Cách nộp bài"
              tooltip="Chỉ áp dụng cho thử thách CODE dạng bài nộp (GitHub/File)."
            >
              <Radio.Group>
                <Radio.Button value="GITHUB">GitHub URL</Radio.Button>
                <Radio.Button value="FILE">Nộp file</Radio.Button>
                <Radio.Button value="BOTH">Cả hai</Radio.Button>
              </Radio.Group>
            </Form.Item>
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

            {/* algo-testcase-starter §3: sườn code per-ngôn-ngữ (learner-safe). Áp cho bài CODE test-case
                (thuật toán). Bỏ trống ⇒ không sửa sườn; đổi/thêm/xoá ngôn ngữ ⇒ BE merge vào grading_config
                (partial-diff theo map). */}
            <Divider orientation="left">Sườn code theo ngôn ngữ</Divider>
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
              Sườn để học viên bắt đầu (import + khai báo hàm + khung đọc I/O) — learner-safe, KHÔNG phải
              đáp án. Để trống nếu bài này không dùng sườn.
            </Typography.Paragraph>
            <StarterCodeEditor />

            {/* challenge-testcase-editor §2.2: lối vào sửa TEST CASE sau khi tạo. Drawer riêng
                (zIndex cao hơn modal) vì test case là danh sách dài, không nhét vừa modal này. */}
            <Divider orientation="left">Test case (chấm tự động)</Divider>
            <Space direction="vertical" size={4} style={{ marginBottom: 16 }}>
              <Button
                icon={<ExperimentOutlined />}
                onClick={() => setTestCasesOpen(true)}
                disabled={!challenge}
              >
                Sửa test case
              </Button>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Thêm / sửa / xoá test case, đặt giới hạn thời gian &amp; bộ nhớ từng case, hoặc nhập
                hàng loạt từ tệp .zip.
              </Typography.Text>
            </Space>
          </>
        )}

        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Ở đây chỉnh nhanh tiêu đề, mô tả, cờ học thử
          {challenge?.type === "CODE" ? ", cách nộp bài và test case" : ""}. Câu hỏi trắc nghiệm và
          rubric chấm điểm vẫn sửa ở nơi khác.
        </Typography.Text>
      </Form>
    </Modal>

    <TestCaseManagerDrawer
      open={testCasesOpen}
      challenge={challenge}
      disabled={disabled}
      onClose={() => setTestCasesOpen(false)}
    />
    </>
  );
}
