import {
  Alert,
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Space,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  MinusCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import type { ChallengeTestCaseItem, ChallengeTestCaseView } from "../types";

/**
 * challenge-testcase-editor §1 — trình soạn test case dùng CHUNG cho:
 *  - wizard TẠO challenge (`ChallengeWizardDrawer` bước "Nội dung"),
 *  - trình sửa SAU KHI TẠO (`TestCaseManagerDrawer`, mở từ kho challenge / modal sửa).
 *
 * Khác bản cũ (Form.List inline trong wizard):
 *  - Input/Expected là `TextArea` monospace → nhập được stdin/stdout NHIỀU DÒNG (hầu hết bài thuật
 *    toán), thay vì `<Input>` một dòng.
 *  - Giới hạn `timeLimitMs`/`memoryLimitMb` LẤY TỪ FORM (per-case) thay vì hardcode 2000/256.
 *  - Sắp xếp (lên/xuống) + xoá + đếm số case với cảnh báo khi tiệm cận cap của BE.
 */

/**
 * Cap BE: `JudgeLimits.DEFAULT_MAX_CASES` / `ftes.challenge.judge.max-cases-per-run` = **100** —
 * MỘT trần dùng chung cho cả soạn đề lẫn lượt chạy (challenge-testcase-judge §7.3). Trước đây hằng
 * này ghi 200 (giá trị cũ, trước khi hai trần được gộp làm một), nên tác giả soạn 150 case KHÔNG bị
 * cảnh báo gì rồi mới ăn lỗi 400 lúc lưu.
 */
export const TEST_CASE_MAX_COUNT = 100;
/** Cap BE: mỗi field input/expected ≤ 64KB. */
export const TEST_CASE_FIELD_MAX_BYTES = 64 * 1024;
/** Default khi tác giả để trống ô giới hạn (khớp default cột DB `time_limit_ms`/`memory_limit_mb`). */
export const DEFAULT_TEST_CASE_TIME_LIMIT_MS = 2000;
export const DEFAULT_TEST_CASE_MEMORY_LIMIT_MB = 256;
/**
 * TRẦN CỨNG của engine chạy code (ftes-ai-service `src/config/settings.py`:
 * `CODE_MAX_RUN_TIMEOUT_MS` / `CODE_MAX_MEMORY_LIMIT_MB`). Engine CLAMP im lặng về trần này và
 * KHÔNG báo lại, nên form phải chặn ngay: đặt 30s/1024MB thì bài vẫn bị TLE/MLE ở 15s/512MB mà tác
 * giả tưởng đề sai. Đổi env ở service thì sửa 2 hằng này cho khớp.
 */
export const TEST_CASE_MAX_TIME_LIMIT_MS = 15_000;
export const TEST_CASE_MAX_MEMORY_LIMIT_MB = 512;
/** Ngưỡng bắt đầu cảnh báo "sắp chạm cap" (90% cap). */
export const TEST_CASE_WARN_COUNT = Math.floor(TEST_CASE_MAX_COUNT * 0.9);

/** Một hàng test case trong form. Giới hạn để optional: trống ⇒ dùng default lúc build payload. */
export interface TestCaseRow {
  name: string;
  input: string;
  expectedOutput: string;
  weight?: number;
  hidden: boolean;
  timeLimitMs?: number;
  memoryLimitMb?: number;
}

// ---- Pure helpers (unit test: TestCaseEditor.test.ts) ----

/** Độ dài BYTE UTF-8 (cap BE tính theo byte, không phải code unit UTF-16 của `String.length`). */
export function utf8ByteLength(value: string | undefined | null): number {
  if (!value) return 0;
  return new TextEncoder().encode(value).length;
}

/**
 * Rows test case → items upsert (PUT `/challenges/{id}/test-cases`).
 * - GIỮ NGUYÊN `input`/`expectedOutput` (kể cả xuống dòng + khoảng trắng đầu dòng) — stdin/stdout
 *   nhiều dòng là ngữ nghĩa của bài, KHÔNG trim.
 * - `weight` default 1; `timeLimitMs`/`memoryLimitMb` LẤY TỪ FORM, chỉ rơi về default khi ô trống
 *   hoặc giá trị không hợp lệ (≤ 0 / không phải số) — trước đây hardcode 2000/256.
 * - `orderNo` theo thứ tự hàng trong form (sắp xếp lên/xuống đổi đúng thứ tự này).
 */
export function buildTestCaseItems(rows: TestCaseRow[]): ChallengeTestCaseItem[] {
  return rows.map((t, i) => ({
    name: t.name,
    input: t.input ?? "",
    expectedOutput: t.expectedOutput ?? "",
    weight: positiveOr(t.weight, 1),
    hidden: Boolean(t.hidden),
    timeLimitMs: positiveOr(t.timeLimitMs, DEFAULT_TEST_CASE_TIME_LIMIT_MS),
    memoryLimitMb: positiveOr(t.memoryLimitMb, DEFAULT_TEST_CASE_MEMORY_LIMIT_MB),
    orderNo: i,
  }));
}

function positiveOr(value: number | null | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Test case ĐÃ LƯU (GET admin) → rows cho form. Sắp theo `orderNo` (BE có thể trả không thứ tự),
 * vá default cho field vắng, chấp nhận cả `hidden` lẫn alias `isHidden` (tên cột DB).
 * `hidden` default TRUE — khớp `is_hidden DEFAULT true` của BE: thà ẩn nhầm còn hơn lộ đáp án.
 */
export function testCaseViewsToRows(views: ChallengeTestCaseView[] | undefined): TestCaseRow[] {
  if (!views?.length) return [];
  return views
    .map((v, i) => ({ v, order: typeof v.orderNo === "number" ? v.orderNo : i, i }))
    .sort((a, b) => a.order - b.order || a.i - b.i)
    .map(({ v }, i) => ({
      name: v.name ?? `Test ${i + 1}`,
      input: v.input ?? "",
      expectedOutput: v.expectedOutput ?? "",
      weight: positiveOr(v.weight, 1),
      hidden: (v.hidden ?? v.isHidden ?? true) === true,
      timeLimitMs: positiveOr(v.timeLimitMs, DEFAULT_TEST_CASE_TIME_LIMIT_MS),
      memoryLimitMb: positiveOr(v.memoryLimitMb, DEFAULT_TEST_CASE_MEMORY_LIMIT_MB),
    }));
}

/** Hàng test case rỗng (nút "Thêm test case" + seed mặc định của wizard). */
export function emptyTestCaseRow(index: number): TestCaseRow {
  return {
    name: `Test ${index + 1}`,
    input: "",
    expectedOutput: "",
    weight: 1,
    hidden: false,
    timeLimitMs: DEFAULT_TEST_CASE_TIME_LIMIT_MS,
    memoryLimitMb: DEFAULT_TEST_CASE_MEMORY_LIMIT_MB,
  };
}

/**
 * challenge-testcase-sample-ui §2 — số case MẪU (học viên THẤY input/output). Hàng vắng/ chưa nhập
 * đếm như mẫu vì `emptyTestCaseRow` mặc định `hidden=false` (tick "Ẩn" mới thành ẩn).
 */
export function countSampleRows(rows: Pick<TestCaseRow, "hidden">[] | undefined): number {
  if (!rows?.length) return 0;
  return rows.reduce((n, r) => (r?.hidden ? n : n + 1), 0);
}

export type SampleCoverageStatus = "empty" | "none" | "ok";

/**
 * challenge-testcase-sample-ui §2.2 — trạng thái "có case mẫu chưa".
 * `none` (có case nhưng ẩn HẾT) là bẫy thật của luồng import: BE mặc định ẩn mọi case, học viên mở
 * bài ra KHÔNG có ví dụ input/output nào để hiểu định dạng đề — phải cảnh báo, không chặn lưu (tác
 * giả có thể cố ý ẩn hết ở bài thi).
 */
export function describeSampleCoverage(rows: Pick<TestCaseRow, "hidden">[] | undefined): {
  status: SampleCoverageStatus;
  samples: number;
  total: number;
  text: string;
} {
  const total = rows?.length ?? 0;
  const samples = countSampleRows(rows);
  if (total === 0) {
    return { status: "empty", samples: 0, total: 0, text: "Chưa có test case nào." };
  }
  if (samples === 0) {
    return {
      status: "none",
      samples,
      total,
      text: `Cả ${total} case đều ẩn — học viên KHÔNG có ví dụ input/output nào để hiểu định dạng đề. Hãy bỏ tick “Ẩn” ở 1–2 case đầu để làm case mẫu.`,
    };
  }
  return {
    status: "ok",
    samples,
    total,
    text: `${samples}/${total} case là MẪU (học viên thấy input/output), ${total - samples} case ẩn (học viên chỉ thấy verdict).`,
  };
}

/**
 * Đọc cờ `hidden` của MỘT hàng trong values thô của Form (dùng cho `shouldUpdate` hẹp: chỉ vẽ lại
 * nhãn Mẫu/Ẩn của đúng hàng vừa đổi, thay vì cả 200 hàng mỗi lần gõ phím). Values chưa khởi tạo /
 * không phải mảng ⇒ `undefined`.
 */
export function readRowHidden(
  values: unknown,
  listName: string,
  index: number
): boolean | undefined {
  const list = (values as Record<string, unknown> | undefined)?.[listName];
  if (!Array.isArray(list)) return undefined;
  return (list[index] as { hidden?: boolean } | undefined)?.hidden;
}

export type TestCaseCountStatus = "ok" | "near" | "over";

/**
 * Bộ đếm số case + cảnh báo tiệm cận cap BE (200). `over` ⇒ BE sẽ TỪ CHỐI cả lô (không ghi case nào)
 * nên phải chặn/ cảnh báo ngay trên form thay vì để người dùng ăn lỗi sau khi soạn 200 case.
 */
export function describeTestCaseCount(count: number): { status: TestCaseCountStatus; text: string } {
  if (count > TEST_CASE_MAX_COUNT) {
    return {
      status: "over",
      text: `${count}/${TEST_CASE_MAX_COUNT} test case — VƯỢT giới hạn, hãy xoá bớt ${
        count - TEST_CASE_MAX_COUNT
      } case trước khi lưu (máy chủ sẽ từ chối cả lô).`,
    };
  }
  if (count >= TEST_CASE_WARN_COUNT) {
    return {
      status: "near",
      text: `${count}/${TEST_CASE_MAX_COUNT} test case — sắp chạm giới hạn tối đa.`,
    };
  }
  return { status: "ok", text: `${count}/${TEST_CASE_MAX_COUNT} test case` };
}

// ---- Component ----

interface TestCaseEditorProps {
  /** Tên Form.List (mặc định "testCases" — khớp `ContentForm` của wizard). */
  name?: string;
  disabled?: boolean;
}

const fieldSizeRule = (label: string) => ({
  validator: (_rule: unknown, value: string | undefined) =>
    utf8ByteLength(value) > TEST_CASE_FIELD_MAX_BYTES
      ? Promise.reject(
          new Error(`${label} vượt ${TEST_CASE_FIELD_MAX_BYTES / 1024}KB — hãy rút gọn hoặc tách case.`)
        )
      : Promise.resolve(),
});

export function TestCaseEditor({ name = "testCases", disabled }: TestCaseEditorProps) {
  return (
    <Form.List name={name}>
      {(fields, { add, remove, move }) => {
        const counter = describeTestCaseCount(fields.length);
        return (
          <>
            <Typography.Paragraph
              type={counter.status === "ok" ? "secondary" : counter.status === "near" ? "warning" : "danger"}
              style={{ fontSize: 12, marginBottom: 8 }}
            >
              {counter.text}
              {counter.status === "ok" && (
                <>
                  {" "}
                  · Input/Output nhận nhiều dòng (mỗi field tối đa{" "}
                  {TEST_CASE_FIELD_MAX_BYTES / 1024}KB).
                </>
              )}
              {/* challenge-testcase-sample-ui §2.1 — nói bằng ngôn ngữ HỌC VIÊN thấy gì, thay vì chỉ
                  "ẩn không lộ đề/đáp án". */}
              <br />
              <Tag color="green" style={{ marginInlineEnd: 4 }}>
                Mẫu
              </Tag>
              học viên <strong>THẤY input và output</strong> của case (ví dụ để hiểu định dạng đề).
              <Tag style={{ marginInlineStart: 8, marginInlineEnd: 4 }}>Ẩn</Tag>
              học viên <strong>chỉ thấy verdict</strong> Đúng/Sai — không thấy input lẫn output.
            </Typography.Paragraph>

            {/* §2.2 — cảnh báo khi KHÔNG có case mẫu nào. Đây là hậu quả mặc định của import ZIP
                (BE đặt hidden=true cho mọi case), nên phải hiện ngay trong trình soạn. */}
            <Form.Item noStyle shouldUpdate>
              {({ getFieldValue }) => {
                const coverage = describeSampleCoverage(
                  getFieldValue(name) as TestCaseRow[] | undefined
                );
                return coverage.status === "none" ? (
                  <Alert
                    type="warning"
                    showIcon
                    message="Không có case mẫu nào"
                    description={coverage.text}
                    style={{ marginBottom: 12 }}
                  />
                ) : coverage.status === "ok" ? (
                  <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
                    {coverage.text}
                  </Typography.Paragraph>
                ) : null;
              }}
            </Form.Item>

            {fields.map(({ key, name: fieldName, ...rf }, index) => (
              <div
                key={key}
                style={{
                  border: "1px solid #f0f0f0",
                  padding: 12,
                  marginBottom: 12,
                  borderRadius: 6,
                }}
              >
                <Space style={{ marginBottom: 8, display: "flex", flexWrap: "wrap" }} align="baseline">
                  <Tag color="blue">Case {index + 1}</Tag>
                  {/* §2.1 — nhãn MẪU/ẨN ngay trên đầu case, đọc cờ `hidden` của CHÍNH hàng này
                      (shouldUpdate hẹp: chỉ vẽ lại khi ô tick của hàng đó đổi). */}
                  <Form.Item
                    noStyle
                    shouldUpdate={(prev, cur) =>
                      readRowHidden(prev, name, fieldName) !== readRowHidden(cur, name, fieldName)
                    }
                  >
                    {({ getFieldValue }) =>
                      getFieldValue([name, fieldName, "hidden"]) ? (
                        <Tooltip title="Học viên chỉ thấy verdict Đúng/Sai của case này.">
                          <Tag>Ẩn</Tag>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Học viên THẤY input và output của case này (ví dụ mẫu).">
                          <Tag color="green">Mẫu</Tag>
                        </Tooltip>
                      )
                    }
                  </Form.Item>
                  <Form.Item
                    {...rf}
                    name={[fieldName, "name"]}
                    rules={[{ required: true, message: "Nhập tên case" }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input placeholder="Tên case" style={{ width: 180 }} />
                  </Form.Item>
                  <Tooltip title="Đưa lên trên">
                    <Button
                      size="small"
                      type="text"
                      icon={<ArrowUpOutlined />}
                      disabled={disabled || index === 0}
                      onClick={() => move(index, index - 1)}
                    />
                  </Tooltip>
                  <Tooltip title="Đưa xuống dưới">
                    <Button
                      size="small"
                      type="text"
                      icon={<ArrowDownOutlined />}
                      disabled={disabled || index === fields.length - 1}
                      onClick={() => move(index, index + 1)}
                    />
                  </Tooltip>
                  <Tooltip title="Xoá case">
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<MinusCircleOutlined />}
                      disabled={disabled}
                      onClick={() => remove(fieldName)}
                    />
                  </Tooltip>
                </Space>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <Form.Item
                    {...rf}
                    name={[fieldName, "input"]}
                    label="Input (stdin)"
                    rules={[fieldSizeRule("Input")]}
                    style={{ marginBottom: 8, flex: "1 1 280px", minWidth: 240 }}
                  >
                    <Input.TextArea
                      rows={5}
                      placeholder={"5\n1 2 3 4 5"}
                      style={{ fontFamily: "monospace" }}
                    />
                  </Form.Item>
                  <Form.Item
                    {...rf}
                    name={[fieldName, "expectedOutput"]}
                    label="Output mong đợi (stdout)"
                    rules={[fieldSizeRule("Output mong đợi")]}
                    style={{ marginBottom: 8, flex: "1 1 280px", minWidth: 240 }}
                  >
                    <Input.TextArea
                      rows={5}
                      placeholder={"15"}
                      style={{ fontFamily: "monospace" }}
                    />
                  </Form.Item>
                </div>

                <Space wrap align="baseline">
                  <Form.Item
                    {...rf}
                    name={[fieldName, "weight"]}
                    label="Trọng số"
                    tooltip="Điểm tương đối của case trong tổng điểm tự động."
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber min={0} step={0.5} style={{ width: 110 }} />
                  </Form.Item>
                  <Form.Item
                    {...rf}
                    name={[fieldName, "timeLimitMs"]}
                    label="Giới hạn thời gian (ms)"
                    tooltip={`Bỏ trống ⇒ ${DEFAULT_TEST_CASE_TIME_LIMIT_MS}ms. Chạy quá ⇒ verdict TLE. Máy chấm chỉ nhận tối đa ${TEST_CASE_MAX_TIME_LIMIT_MS}ms.`}
                    extra={`Tối đa ${TEST_CASE_MAX_TIME_LIMIT_MS}ms`}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber
                      min={100}
                      max={TEST_CASE_MAX_TIME_LIMIT_MS}
                      step={500}
                      placeholder={String(DEFAULT_TEST_CASE_TIME_LIMIT_MS)}
                      style={{ width: 150 }}
                    />
                  </Form.Item>
                  <Form.Item
                    {...rf}
                    name={[fieldName, "memoryLimitMb"]}
                    label="Giới hạn bộ nhớ (MB)"
                    tooltip={`Bỏ trống ⇒ ${DEFAULT_TEST_CASE_MEMORY_LIMIT_MB}MB. Vượt ⇒ verdict MLE. Máy chấm chỉ nhận tối đa ${TEST_CASE_MAX_MEMORY_LIMIT_MB}MB.`}
                    extra={`Tối đa ${TEST_CASE_MAX_MEMORY_LIMIT_MB}MB`}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber
                      min={16}
                      max={TEST_CASE_MAX_MEMORY_LIMIT_MB}
                      step={64}
                      placeholder={String(DEFAULT_TEST_CASE_MEMORY_LIMIT_MB)}
                      style={{ width: 150 }}
                    />
                  </Form.Item>
                  {/* §2.1 — bỏ tick = case MẪU. Diễn đạt theo thứ học viên NHÌN THẤY thay vì
                      "ẩn/không ẩn" trừu tượng. */}
                  <Form.Item
                    {...rf}
                    name={[fieldName, "hidden"]}
                    valuePropName="checked"
                    tooltip="Bỏ tick ⇒ case MẪU: học viên thấy input + output. Tick ⇒ ẩn: học viên chỉ thấy verdict."
                    style={{ marginBottom: 0 }}
                  >
                    <Checkbox>Ẩn với học viên (bỏ tick = case mẫu)</Checkbox>
                  </Form.Item>
                </Space>
              </div>
            ))}

            <Button
              type="dashed"
              icon={<PlusOutlined />}
              disabled={disabled || fields.length >= TEST_CASE_MAX_COUNT}
              onClick={() => add(emptyTestCaseRow(fields.length))}
            >
              Thêm test case
            </Button>
          </>
        );
      }}
    </Form.List>
  );
}
