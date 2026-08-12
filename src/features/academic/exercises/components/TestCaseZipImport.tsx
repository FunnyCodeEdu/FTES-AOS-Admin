import { useState } from "react";
import {
  Alert,
  Button,
  Form,
  InputNumber,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import { InboxOutlined } from "@ant-design/icons";
import { adminErrorMessage, handleAdminMutationError } from "../../../../shared/api/errors";
import { useImportChallengeTestCasesZip } from "../api/exercises.api";
import type {
  ChallengeTestCaseView,
  TestCaseImportResult,
  TestCaseImportSkipped,
} from "../types";
import { TEST_CASE_MAX_COUNT } from "./TestCaseEditor";

/**
 * challenge-testcase-editor §3 — nhập hàng loạt test case từ ZIP kiểu HackerRank.
 *
 * Luồng 2 BƯỚC (khớp contract BE `challenge-testcase-judge` §3.2) — import thật là THAY THẾ toàn bộ
 * bộ test, nên bước xem trước BẮT BUỘC phải `dryRun`:
 *  1. Chọn `.zip` (`beforeUpload` trả `false` ⇒ AntD KHÔNG tự upload; ta tự dựng FormData).
 *  2. PHÂN TÍCH — `POST /admin/challenges/{id}/test-cases/import?dryRun=true`: BE giải nén trong bộ
 *     nhớ (extractor hardened: 2000 entry / 64MB / chống zip-bomb + path-traversal), ghép cặp
 *     input/output và trả bản xem trước, **KHÔNG ghi DB**, KHÔNG lưu file zip.
 *  3. PREVIEW: số case đọc được + BẢNG entry bị bỏ qua kèm LÝ DO.
 *  4. XÁC NHẬN — gọi lại KHÔNG dryRun để ghi thật (thay thế toàn bộ), rồi `onImported()` để caller
 *     refetch danh sách.
 *
 * Lỗi BE (zip bomb, vượt cap 100 case, không có cặp hợp lệ…) đi qua `handleAdminMutationError` +
 * hiện inline để tác giả biết KHÔNG có test case nào bị đổi.
 *
 * challenge-testcase-sample-ui §1 — thêm ô "Số case mẫu": BE mặc định MỌI case import là ẨN, nên
 * nạp 100 case là học viên không thấy một ví dụ input/output nào (khác hẳn HackerRank luôn công khai
 * vài sample). Số này đi kèm CẢ hai lượt gọi (phân tích + ghi thật) để bản xem trước đúng bằng thứ
 * sẽ được ghi.
 */

/** ~32MB — chặn sớm phía client, BE vẫn là chốt chặn thật (64MB uncompressed). */
export const TEST_CASE_ZIP_MAX_BYTES = 32 * 1024 * 1024;

/**
 * Số case mẫu mặc định khi import (khớp default `sampleCount` của BE `challenge-testcase-samples`
 * §1.2). 2 là đủ để học viên hiểu định dạng input/output mà không phát đáp án.
 */
export const DEFAULT_IMPORT_SAMPLE_COUNT = 2;

interface TestCaseZipImportProps {
  challengeId: string;
  disabled?: boolean;
  /** Gọi SAU khi đã ghi thật bộ test từ .zip (caller refetch + reset form). */
  onImported: () => void;
}

/**
 * Chuẩn hoá response import.
 *
 * Hình dạng THẬT của BE (`ChallengeTestCaseApi.ImportResult`):
 * `{imported: int, skipped: [{entry, reason}], testCases: [TestCaseView]}` — `imported` LUÔN là SỐ và
 * `testCases` đi KÈM nó. Vì vậy `testCases` phải được đọc ĐỘC LẬP với `imported`: nếu chỉ đọc khi
 * `imported` không phải số thì nhánh đó chết cứng, `cases` luôn `undefined` và bảng xem trước KHÔNG
 * BAO GIỜ hiện — mất hẳn yêu cầu "xem trước rồi mới lưu".
 *
 * Vẫn giữ các fallback dung sai cho hình dạng khác:
 *  - `imported` là MẢNG case (⇒ dùng luôn làm preview, `imported` = độ dài),
 *  - vắng `imported` số nhưng có `testCases` (⇒ `imported` = độ dài mảng),
 *  - `skipped` là mảng chuỗi (⇒ reason mặc định),
 *  - payload rỗng/lạ (⇒ 0 case, không skip) thay vì nổ runtime.
 * Pure → unit test ở `TestCaseZipImport.test.ts`.
 */
export function normalizeImportResult(raw: unknown): TestCaseImportResult {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const rawImported = obj.imported;
  // Wire field chuẩn `testCases` đọc TRƯỚC và không phụ thuộc `imported`; mảng ở `imported` chỉ là
  // fallback cho hình dạng cũ.
  const cases: ChallengeTestCaseView[] | undefined = Array.isArray(obj.testCases)
    ? (obj.testCases as ChallengeTestCaseView[])
    : Array.isArray(rawImported)
      ? (rawImported as ChallengeTestCaseView[])
      : undefined;

  let imported = 0;
  if (typeof rawImported === "number" && Number.isFinite(rawImported)) {
    imported = Math.max(0, Math.trunc(rawImported));
  } else if (cases) {
    imported = cases.length;
  }

  const rawSkipped = Array.isArray(obj.skipped) ? obj.skipped : [];
  const skipped: TestCaseImportSkipped[] = rawSkipped.map((s, i) => {
    if (typeof s === "string") return { entry: s, reason: "Không ghép được cặp input/output" };
    const item = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
    return {
      entry: typeof item.entry === "string" ? item.entry : `(entry ${i + 1})`,
      reason: typeof item.reason === "string" ? item.reason : "Không rõ lý do",
    };
  });

  return { imported, skipped, ...(cases ? { cases } : {}) };
}

/** Cắt ngắn nội dung nhiều dòng cho ô preview (giữ dấu xuống dòng thành ⏎ để thấy là multi-line). */
export function previewSnippet(value: string | null | undefined, max = 60): string {
  const text = (value ?? "").replace(/\r?\n/g, "⏎");
  return text.length > max ? `${text.slice(0, max)}…` : text || "—";
}

/**
 * challenge-testcase-sample-ui §1.1 — chuẩn hoá ô "Số case mẫu" trước khi gửi.
 * `0` HỢP LỆ (chủ đích: ẩn hết); ô trống / NaN / âm ⇒ về mặc định 2 thay vì gửi rác; trần là cap
 * test case của BE (100) vì không thể có nhiều case mẫu hơn tổng số case.
 */
export function clampSampleCount(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return DEFAULT_IMPORT_SAMPLE_COUNT;
  }
  return Math.min(Math.trunc(value), TEST_CASE_MAX_COUNT);
}

/**
 * Case này sẽ là MẪU (học viên thấy input/output)? Đọc cờ `hidden` BE trả ở bản xem trước, chấp
 * nhận cả alias `isHidden` (tên cột DB). Vắng cả hai ⇒ coi là ẨN — khớp `is_hidden DEFAULT true`
 * của BE, thà báo ẩn nhầm còn hơn hứa với tác giả là có mẫu rồi học viên chẳng thấy gì.
 */
export function isSampleCase(view: Pick<ChallengeTestCaseView, "hidden" | "isHidden">): boolean {
  return (view.hidden ?? view.isHidden ?? true) === false;
}

/** Đếm số case MẪU trong bản xem trước (dùng cho dòng tóm tắt trên Alert). */
export function countSampleCases(cases: ChallengeTestCaseView[] | undefined): number {
  if (!cases?.length) return 0;
  return cases.reduce((n, c) => (isSampleCase(c) ? n + 1 : n), 0);
}

export function TestCaseZipImport({ challengeId, disabled, onImported }: TestCaseZipImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<TestCaseImportResult | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  // §1.1 — số case ĐẦU sẽ là mẫu. `null` = ô đang trống (người dùng xoá số) → clamp về mặc định
  // lúc gửi, KHÔNG chặn nút, vì BE cũng có mặc định riêng.
  const [sampleCount, setSampleCount] = useState<number | null>(DEFAULT_IMPORT_SAMPLE_COUNT);
  const importZip = useImportChallengeTestCasesZip();

  const pickFile = (picked: File): boolean => {
    if (!picked.name.toLowerCase().endsWith(".zip")) {
      message.error("Chỉ nhận tệp .zip.");
      return false; // reject — chặn AntD tự upload
    }
    if (picked.size > TEST_CASE_ZIP_MAX_BYTES) {
      message.error(`Tệp .zip quá lớn (tối đa ${TEST_CASE_ZIP_MAX_BYTES / (1024 * 1024)}MB).`);
      return false;
    }
    setFile(picked);
    setResult(null);
    setErrorText(null);
    return false; // LUÔN chặn upload tự động — ta tự POST multipart
  };

  /**
   * Bước 1 — PHÂN TÍCH (`dryRun`): máy chủ đọc ZIP rồi trả bản xem trước, KHÔNG ghi gì. Bắt buộc
   * phải dryRun ở bước này: import thật là THAY THẾ toàn bộ bộ test hiện có, nên nếu "xem thử" mà
   * gọi import thật thì chỉ mở tệp lên xem đã xoá sạch test case cũ.
   */
  const handleAnalyze = () => {
    if (!file) return;
    setErrorText(null);
    importZip.mutate(
      { id: challengeId, file, dryRun: true, sampleCount: clampSampleCount(sampleCount) },
      {
        onSuccess: (raw) => {
          const parsed = normalizeImportResult(raw);
          setResult(parsed);
          if (parsed.imported === 0) {
            message.warning("Không có cặp input/output hợp lệ nào trong tệp .zip.");
          }
        },
        onError: (err) => {
          setResult(null);
          setErrorText(adminErrorMessage(err));
          handleAdminMutationError(err);
        },
      }
    );
  };

  /**
   * Bước 2 — GHI THẬT: thay thế toàn bộ bộ test bằng danh sách vừa xem trước. `sampleCount` phải là
   * ĐÚNG số đã dùng ở bước phân tích (cùng `clampSampleCount`), nếu không thứ được ghi sẽ đánh dấu
   * mẫu khác với bảng tác giả vừa duyệt.
   */
  const handleConfirm = () => {
    if (!file) return;
    setErrorText(null);
    importZip.mutate(
      { id: challengeId, file, dryRun: false, sampleCount: clampSampleCount(sampleCount) },
      {
        onSuccess: (raw) => {
          const parsed = normalizeImportResult(raw);
          const samples = countSampleCases(parsed.cases);
          message.success(
            `Đã thay bộ test bằng ${parsed.imported} case từ .zip${
              parsed.cases?.length ? ` · ${samples} case mẫu` : ""
            }`
          );
          setFile(null);
          setResult(null);
          onImported();
        },
        onError: (err) => {
          setErrorText(adminErrorMessage(err));
          handleAdminMutationError(err);
        },
      }
    );
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Upload.Dragger
        accept=".zip"
        maxCount={1}
        showUploadList={false}
        beforeUpload={pickFile}
        disabled={disabled || importZip.isPending}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Kéo-thả tệp .zip test case vào đây</p>
        <p className="ant-upload-hint">
          Hỗ trợ <code>input/inputNN.txt</code> + <code>output/outputNN.txt</code> (kiểu HackerRank)
          hoặc cặp phẳng <code>NN.in</code> / <code>NN.out</code>. Tối đa {TEST_CASE_MAX_COUNT} case.
          Tệp .zip KHÔNG được lưu lại — máy chủ chỉ đọc rồi bỏ.
        </p>
      </Upload.Dragger>

      {/* challenge-testcase-sample-ui §1.1–1.3: BE mặc định ẩn HẾT case import, nên phải nói rõ bao
          nhiêu case đầu là MẪU. Đổi số ⇒ bỏ bản xem trước cũ, bắt phân tích lại: preview và thứ
          được ghi luôn phải sinh ra từ cùng một `sampleCount`. */}
      <Form layout="vertical" component="div">
        <Form.Item
          label="Số case mẫu"
          tooltip="Case MẪU là case học viên THẤY input/output (như sample của HackerRank). Các case còn lại ẩn — học viên chỉ thấy verdict Đúng/Sai."
          extra={
            <>
              {`Mặc định ${DEFAULT_IMPORT_SAMPLE_COUNT} · đặt 0 nếu muốn ẩn hết. `}
              Nếu trong tệp .zip có thư mục <code>sample/</code> (hoặc <code>samples</code>,{" "}
              <code>example</code>, <code>examples</code>) thì <strong>thư mục đó được ưu tiên</strong>{" "}
              — đúng những case trong đó là mẫu và số này bị bỏ qua.
            </>
          }
          style={{ marginBottom: 0 }}
        >
          <InputNumber
            min={0}
            max={TEST_CASE_MAX_COUNT}
            value={sampleCount}
            onChange={(v) => {
              setSampleCount(v);
              // Bản xem trước cũ dựng theo số cũ ⇒ không còn khớp thứ sẽ ghi. Xoá để tác giả
              // BUỘC phải phân tích lại trước khi xác nhận.
              setResult(null);
            }}
            disabled={disabled || importZip.isPending}
            placeholder={String(DEFAULT_IMPORT_SAMPLE_COUNT)}
            style={{ width: 140 }}
          />
        </Form.Item>
      </Form>

      {file && (
        <Alert
          type="info"
          showIcon
          message={`Đã chọn: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`}
          action={
            <Space>
              <Button size="small" onClick={() => setFile(null)} disabled={importZip.isPending}>
                Bỏ chọn
              </Button>
              <Button
                size="small"
                type="primary"
                loading={importZip.isPending}
                onClick={handleAnalyze}
                disabled={disabled}
              >
                Tải lên & phân tích
              </Button>
            </Space>
          }
        />
      )}

      {errorText && (
        <Alert
          type="error"
          showIcon
          message="Không nhập được tệp .zip"
          description={`${errorText} — chưa có test case nào bị thay đổi.`}
        />
      )}

      {result && (
        <Space direction="vertical" size="small" style={{ width: "100%" }}>
          <Alert
            type={result.imported === 0 ? "warning" : result.skipped.length > 0 ? "warning" : "success"}
            showIcon
            message={
              <>
                Đọc được <strong>{result.imported}</strong> test case
                {result.cases?.length
                  ? ` · ${countSampleCases(result.cases)} case mẫu (học viên thấy input/output)`
                  : ""}
                {result.skipped.length > 0 ? ` · bỏ qua ${result.skipped.length} entry` : ""}
                {" · chưa ghi gì"}
              </>
            }
            description={
              result.imported > 0
                ? "Soát danh sách bên dưới rồi bấm “Xác nhận thay bộ test”. Thao tác này THAY THẾ toàn bộ test case hiện có của challenge."
                : "Kiểm tra lại cấu trúc thư mục trong tệp .zip — không có cặp input/output nào ghép được."
            }
            action={
              result.imported > 0 ? (
                <Button
                  size="small"
                  type="primary"
                  danger
                  loading={importZip.isPending}
                  onClick={handleConfirm}
                >
                  Xác nhận thay bộ test
                </Button>
              ) : null
            }
          />

          {result.cases && result.cases.length > 0 && (
            <>
              <Typography.Text strong style={{ fontSize: 13 }}>
                Case đọc được từ tệp
              </Typography.Text>
              <Table<ChallengeTestCaseView>
                size="small"
                rowKey={(r, i) => r.id ?? `${r.name ?? "case"}-${i}`}
                dataSource={result.cases}
                pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
                columns={[
                  { title: "Tên", dataIndex: "name", width: 140, render: (v) => v ?? "—" },
                  {
                    // §1.2 — cột "Mẫu" đọc cờ `hidden` BE trả về: tác giả thấy NGAY case nào sẽ lộ
                    // cho học viên trước khi bấm xác nhận (thư mục `sample/` cũng phản ánh ở đây).
                    title: "Mẫu",
                    width: 90,
                    render: (_, r) =>
                      isSampleCase(r) ? <Tag color="green">Mẫu</Tag> : <Tag>Ẩn</Tag>,
                  },
                  {
                    title: "Input",
                    render: (_, r) => <code style={{ fontSize: 12 }}>{previewSnippet(r.input)}</code>,
                  },
                  {
                    title: "Output mong đợi",
                    render: (_, r) => (
                      <code style={{ fontSize: 12 }}>{previewSnippet(r.expectedOutput)}</code>
                    ),
                  },
                ]}
              />
            </>
          )}

          {result.skipped.length > 0 && (
            <>
              <Typography.Text strong style={{ fontSize: 13 }}>
                Entry bị bỏ qua
              </Typography.Text>
              <Table<TestCaseImportSkipped>
                size="small"
                rowKey={(r, i) => `${r.entry}-${i}`}
                dataSource={result.skipped}
                pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
                columns={[
                  { title: "Tệp trong .zip", dataIndex: "entry", width: 260 },
                  {
                    title: "Lý do",
                    dataIndex: "reason",
                    render: (v: string) => <Tag color="orange">{v}</Tag>,
                  },
                ]}
              />
            </>
          )}
        </Space>
      )}
    </Space>
  );
}
