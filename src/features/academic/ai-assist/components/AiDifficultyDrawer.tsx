// Drawer "Phân tích độ khó (AI)" cho một câu hỏi trong quiz bank (design admin-lecturer-ai-assist §3).
//
// Luồng: mở drawer cho 1 quizId → submit POST /ai/teacher/difficulty (envelope 1002 → JobRef) →
// poll GET /ai/jobs/{id} → render result (markdown/structured qua readDifficultyResult) + model note.
// FAILED → hiện errorCode + nút "Thử lại". Submit KHÔNG ghi gì lên câu hỏi — chỉ đọc/phân tích.
//
// BE guardLecturerScope: quizId phải thuộc phạm vi giảng viên; 403 = ngoài phạm vi → message rõ.

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Drawer, Empty, Space, Spin, Tag, Typography } from "antd";
import { ReloadOutlined, RobotOutlined } from "@ant-design/icons";
import MDEditor from "@uiw/react-md-editor";
import rehypeSanitize from "rehype-sanitize";
import { ApiError } from "../../../../shared/api/client";
import { useUIStore } from "../../../../shared/stores/uiStore";
import { submitDifficulty } from "../api";
import { useAiJobPolling } from "../hooks/useAiJobPolling";
import { readDifficultyResult } from "../lib/difficultyResult";

interface AiDifficultyDrawerProps {
  open: boolean;
  /** Câu hỏi cần phân tích; null khi drawer đóng. */
  quizId: string | null;
  /** Nội dung câu hỏi để hiển thị ngữ cảnh trong drawer (tuỳ chọn). */
  questionLabel?: string;
  onClose: () => void;
}

function submitErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 403) {
      return "Bạn không có quyền phân tích câu hỏi này (chỉ giảng viên phụ trách môn mới phân tích được).";
    }
    if (err.code === 400) {
      return err.errorCode === "AI_INPUT_INVALID"
        ? "Câu hỏi không hợp lệ để phân tích."
        : err.message;
    }
    return err.message || "Phân tích độ khó thất bại. Vui lòng thử lại.";
  }
  return "Phân tích độ khó thất bại. Vui lòng thử lại.";
}

export function AiDifficultyDrawer({ open, quizId, questionLabel, onClose }: AiDifficultyDrawerProps) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const theme = useUIStore((s) => s.theme);

  const poll = useAiJobPolling(jobId);

  const run = (id: string) => {
    setSubmitError(null);
    setSubmitting(true);
    setJobId(null);
    submitDifficulty({ quizId: id })
      .then((ref) => setJobId(ref.jobId))
      .catch((err) => setSubmitError(submitErrorMessage(err)))
      .finally(() => setSubmitting(false));
  };

  // Auto-submit MỘT lần mỗi khi drawer mở cho một quizId (ref chặn double-invoke StrictMode).
  const startedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!open || !quizId) {
      startedFor.current = null;
      return;
    }
    if (startedFor.current === quizId) return;
    startedFor.current = quizId;
    run(quizId);
    // run/setState ổn định; chủ ý chỉ chạy lại khi open/quizId đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quizId]);

  const isPolling = jobId != null && poll.isRunning;
  const view = poll.isComplete ? readDifficultyResult(poll.result) : undefined;
  const jobErrorCode = poll.job?.errorCode;

  const handleRetry = () => {
    if (quizId) run(quizId);
  };

  return (
    <Drawer
      title={
        <Space>
          <RobotOutlined />
          <span>Phân tích độ khó (AI)</span>
        </Space>
      }
      width={520}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      {questionLabel && (
        <Typography.Paragraph type="secondary" ellipsis={{ rows: 3 }} style={{ marginBottom: 16 }}>
          {questionLabel}
        </Typography.Paragraph>
      )}

      {submitError && (
        <Alert
          type="error"
          showIcon
          message={submitError}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={handleRetry}>
              Thử lại
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {(submitting || isPolling) && !submitError && (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <Spin />
          <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
            {poll.isStale ? "Vẫn đang phân tích…" : "AI đang phân tích độ khó…"}
          </Typography.Paragraph>
        </div>
      )}

      {poll.isFailed && (
        <Alert
          type="error"
          showIcon
          message="Phân tích thất bại"
          description={
            poll.job?.errorMessage || jobErrorCode
              ? `${poll.job?.errorMessage ?? "Job thất bại"}${jobErrorCode ? ` (mã lỗi: ${jobErrorCode})` : ""}`
              : "Job không hoàn tất. Thử lại."
          }
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={handleRetry}>
              Thử lại
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {poll.error && !poll.isFailed && (
        <Alert
          type="warning"
          showIcon
          message="Không lấy được trạng thái phân tích"
          description={poll.error.message}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={() => poll.refresh()}>
              Tải lại
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {view && (
        <>
          {view.model && (
            <Tag color="blue" style={{ marginBottom: 12 }}>
              Model: {view.model}
            </Tag>
          )}
          {view.markdown.trim() ? (
            <div data-color-mode={theme}>
              <MDEditor.Markdown
                source={view.markdown}
                rehypePlugins={[[rehypeSanitize]]}
                style={{ background: "transparent" }}
              />
            </div>
          ) : (
            <Empty description="AI không trả về nội dung phân tích. Thử lại." />
          )}
        </>
      )}
    </Drawer>
  );
}
