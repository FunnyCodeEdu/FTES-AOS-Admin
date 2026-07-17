// Panel AI soạn thảo NHÚNG trong LessonContentEditor (design admin-lecturer-ai-assist §7.3).
//
// 4 quick-action (dàn ý / nháp section theo heading / sửa đoạn bôi đen / ví dụ+câu hỏi) + prompt tự
// do → stream SSE (LESSON_SUGGESTION) vào PREVIEW monospace, KHÔNG ghi thẳng editor khi đang stream.
// Chèn CÓ KIỂM SOÁT sau khi done: chèn-tại-con-trỏ / thay-đoạn-bôi-đen + hoàn-tác 1 mức, mọi ghi đi
// qua onBodyChange (state + draft store local) — KHÔNG gọi save (nút Lưu của editor là đường duy nhất).
// Đoạn bôi đen: snapshot {start,end,text} lúc bấm (giữ qua việc focus chuyển vào panel).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Divider,
  Empty,
  Input,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import { CloseOutlined, RobotOutlined, StopOutlined } from "@ant-design/icons";
import { fetchAiModels } from "../api";
import type { AiModelCatalog } from "../types";
import { useAiDraftStream } from "../hooks/useAiDraftStream";
import {
  clampSelectionText,
  draftErrorMessage,
  insertAtCaret,
  parseHeadings,
  replaceRange,
  type SelectionSnapshot,
} from "../lib/lessonDraft";

interface LessonAiDraftPanelProps {
  lessonId: string;
  /** Body markdown hiện tại (controlled bởi editor). */
  body: string;
  /** Ghi body qua đường local của editor (handleChange → state + draft store). KHÔNG save. */
  onBodyChange: (value: string) => void;
  /** Ref textarea của editor (antd TextAreaRef ở runtime) — đọc caret + selection. */
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  disabled?: boolean;
  onClose: () => void;
}

/** Lấy DOM textarea thật từ ref antd (runtime là TextAreaRef {resizableTextArea:{textArea}}). */
function domTextarea(ref: React.RefObject<HTMLTextAreaElement>): HTMLTextAreaElement | null {
  const cur = ref.current as unknown;
  if (!cur) return null;
  if (cur instanceof HTMLTextAreaElement) return cur;
  const wrapped = cur as { resizableTextArea?: { textArea?: HTMLTextAreaElement } };
  return wrapped.resizableTextArea?.textArea ?? null;
}

/** Đọc phòng thủ catalog model → options cho Select. Shape passthrough nên chịu string | object. */
function toModelOptions(catalog: AiModelCatalog): { value: string; label: string }[] {
  const models = catalog?.models;
  if (!Array.isArray(models)) return [];
  const out: { value: string; label: string }[] = [];
  for (const m of models) {
    if (typeof m === "string") {
      out.push({ value: m, label: m });
    } else if (m && typeof m === "object") {
      const o = m as Record<string, unknown>;
      const id = o.id ?? o.name ?? o.model;
      if (typeof id === "string") {
        const label = typeof o.label === "string" ? o.label : id;
        out.push({ value: id, label });
      }
    }
  }
  return out;
}

const OUTLINE_PROMPT =
  "Lập dàn ý chi tiết (dùng heading markdown) cho bài học này dựa trên tiêu đề và mô tả khóa học.";
const EXAMPLES_PROMPT =
  "Viết phần ví dụ minh họa và 3-5 câu hỏi ôn tập (kèm đáp án gọn) cho phần cuối bài học.";

type RewriteVariant = "rewrite" | "improve" | "explain";

const REWRITE_LABEL: Record<RewriteVariant, string> = {
  rewrite: "Viết lại",
  improve: "Cải thiện",
  explain: "Giải thích thêm",
};

function rewritePrompt(variant: RewriteVariant, text: string): string {
  const intro =
    variant === "rewrite"
      ? "Viết lại đoạn sau cho mạch lạc, giữ nguyên ý"
      : variant === "improve"
        ? "Cải thiện văn phong và độ rõ ràng của đoạn sau"
        : "Giải thích rõ hơn nội dung của đoạn sau, bổ sung ví dụ nếu cần";
  return `${intro}:\n\n"""\n${text}\n"""`;
}

export function LessonAiDraftPanel({
  lessonId,
  body,
  onBodyChange,
  textareaRef,
  disabled,
  onClose,
}: LessonAiDraftPanelProps) {
  const { streaming, output, error, modelUsed, hasResult, send, stop } =
    useAiDraftStream(lessonId);

  const [freePrompt, setFreePrompt] = useState("");
  const [sectionHeading, setSectionHeading] = useState<string | undefined>(undefined);
  const [hasSelection, setHasSelection] = useState(false);
  // Selection bôi đen gần nhất đã dùng cho rewrite → dùng cho "Thay đoạn bôi đen".
  const [replaceTarget, setReplaceTarget] = useState<SelectionSnapshot | null>(null);
  // Undo 1 mức: {before, after}. canUndo khi body vẫn == after (user chưa gõ tiếp).
  const [undoState, setUndoState] = useState<{ before: string; after: string } | null>(null);

  const [modelOptions, setModelOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined);

  const previewRef = useRef<HTMLDivElement>(null);

  const headings = useMemo(() => parseHeadings(body), [body]);

  // Model picker optional: nạp catalog, ẩn nếu lỗi (design §7.3).
  useEffect(() => {
    let alive = true;
    fetchAiModels()
      .then((catalog) => {
        if (alive) setModelOptions(toModelOptions(catalog));
      })
      .catch(() => {
        if (alive) setModelOptions([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Theo dõi vùng chọn textarea để bật/tắt nhóm action "bôi đen". KHÔNG clear khi blur (snapshot phải
  // sống qua việc focus chuyển vào panel) — chỉ cập nhật khi có tương tác chọn/gõ/click trên textarea.
  useEffect(() => {
    const ta = domTextarea(textareaRef);
    if (!ta) return;
    const update = () => {
      const start = ta.selectionStart ?? 0;
      const end = ta.selectionEnd ?? 0;
      setHasSelection(end > start);
    };
    update();
    ta.addEventListener("select", update);
    ta.addEventListener("keyup", update);
    ta.addEventListener("mouseup", update);
    return () => {
      ta.removeEventListener("select", update);
      ta.removeEventListener("keyup", update);
      ta.removeEventListener("mouseup", update);
    };
  }, [textareaRef]);

  // Auto-scroll preview khi stream chảy.
  useEffect(() => {
    const el = previewRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [output]);

  const captureSelection = useCallback((): SelectionSnapshot | null => {
    const ta = domTextarea(textareaRef);
    if (!ta) return null;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    if (end <= start) return null;
    return { start, end, text: body.slice(start, end) };
  }, [textareaRef, body]);

  const currentCaret = useCallback((): number => {
    const ta = domTextarea(textareaRef);
    return ta?.selectionStart ?? body.length;
  }, [textareaRef, body]);

  const runRewrite = (variant: RewriteVariant) => {
    const snap = captureSelection();
    if (!snap) {
      message.info("Hãy bôi đen một đoạn trong ô soạn thảo trước.");
      return;
    }
    const { text, truncated } = clampSelectionText(snap.text);
    if (truncated) {
      message.warning("Đoạn quá dài — chỉ gửi 4000 ký tự đầu cho AI.");
    }
    setReplaceTarget(snap);
    void send(rewritePrompt(variant, text), selectedModel);
  };

  const runSection = () => {
    if (!sectionHeading) return;
    void send(
      `Viết nội dung cho section «${sectionHeading}» theo dàn ý hiện có của bài học.`,
      selectedModel,
    );
  };

  const runFree = () => {
    const prompt = freePrompt.trim();
    if (!prompt) return;
    void send(prompt, selectedModel);
  };

  const applyBody = (nextBody: string) => {
    setUndoState({ before: body, after: nextBody });
    onBodyChange(nextBody);
  };

  const handleInsertAtCaret = () => {
    if (!output) return;
    applyBody(insertAtCaret(body, currentCaret(), output));
  };

  const handleReplaceSelection = () => {
    if (!output || !replaceTarget) return;
    applyBody(replaceRange(body, replaceTarget.start, replaceTarget.end, output));
  };

  const canUndo = undoState != null && body === undoState.after;
  const handleUndo = () => {
    if (!canUndo || !undoState) return;
    onBodyChange(undoState.before);
    setUndoState(null);
  };

  const canInsert = hasResult && !streaming && !error && output.length > 0;

  return (
    <Card
      size="small"
      style={{ marginBottom: 16 }}
      title={
        <Space>
          <RobotOutlined />
          <span>Trợ lý AI soạn thảo</span>
        </Space>
      }
      extra={
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={onClose}
          aria-label="Đóng trợ lý AI"
        />
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        AI dựa trên tiêu đề bài học và mô tả khóa học (ngữ cảnh do máy chủ ghép). Kết quả xem trước ở
        dưới — chỉ vào bài khi bạn bấm chèn; không có lưu tự động.
      </Typography.Paragraph>

      <Space direction="vertical" size="small" style={{ width: "100%" }}>
        <Space wrap>
          <Button
            onClick={() => void send(OUTLINE_PROMPT, selectedModel)}
            disabled={disabled || streaming}
          >
            Sinh dàn ý
          </Button>
          <Button
            onClick={() => void send(EXAMPLES_PROMPT, selectedModel)}
            disabled={disabled || streaming}
          >
            Ví dụ + câu hỏi ôn tập
          </Button>
        </Space>

        <Space wrap align="center">
          <Select
            placeholder={headings.length ? "Chọn section theo heading" : "Chưa có heading trong bài"}
            style={{ minWidth: 240 }}
            value={sectionHeading}
            onChange={setSectionHeading}
            options={headings.map((h) => ({ value: h, label: h }))}
            disabled={disabled || streaming || headings.length === 0}
            allowClear
          />
          <Button onClick={runSection} disabled={disabled || streaming || !sectionHeading}>
            Viết nháp section
          </Button>
        </Space>

        <Space wrap align="center">
          <Typography.Text type="secondary">Đoạn bôi đen:</Typography.Text>
          {(["rewrite", "improve", "explain"] as RewriteVariant[]).map((v) => (
            <Button
              key={v}
              size="small"
              onClick={() => runRewrite(v)}
              disabled={disabled || streaming || !hasSelection}
            >
              {REWRITE_LABEL[v]}
            </Button>
          ))}
          {!hasSelection && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              (bôi đen một đoạn trong ô soạn thảo để bật)
            </Typography.Text>
          )}
        </Space>

        <Space.Compact style={{ width: "100%" }}>
          <Input.TextArea
            value={freePrompt}
            onChange={(e) => setFreePrompt(e.target.value)}
            placeholder="Yêu cầu tự do cho AI (vd: viết đoạn mở bài súc tích)…"
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={disabled || streaming}
          />
        </Space.Compact>
        <Space wrap>
          <Button type="primary" onClick={runFree} disabled={disabled || streaming || !freePrompt.trim()}>
            Gửi yêu cầu
          </Button>
          {modelOptions.length > 0 && (
            <Select
              placeholder="Model (mặc định)"
              style={{ minWidth: 200 }}
              value={selectedModel}
              onChange={setSelectedModel}
              options={modelOptions}
              disabled={disabled || streaming}
              allowClear
              size="small"
            />
          )}
        </Space>
      </Space>

      <Divider style={{ margin: "12px 0" }} />

      {error && (
        <Alert type="error" showIcon message={draftErrorMessage(error)} style={{ marginBottom: 12 }} />
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <Space>
          <Typography.Text strong>Xem trước</Typography.Text>
          {streaming && <Spin size="small" />}
          {modelUsed && (
            <Tag color="blue" style={{ margin: 0 }}>
              Model: {modelUsed}
            </Tag>
          )}
        </Space>
        {streaming && (
          <Button size="small" danger icon={<StopOutlined />} onClick={stop}>
            Dừng
          </Button>
        )}
      </div>

      <div
        ref={previewRef}
        style={{
          maxHeight: 260,
          overflowY: "auto",
          background: "rgba(0,0,0,0.03)",
          border: "1px solid #f0f0f0",
          borderRadius: 6,
          padding: 12,
          fontFamily: "monospace",
          fontSize: 13,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          minHeight: 80,
        }}
      >
        {output ? (
          output
        ) : (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={streaming ? "AI đang soạn…" : "Chọn một hành động để bắt đầu"}
            />
          </div>
        )}
      </div>

      <Space wrap style={{ marginTop: 12 }}>
        <Button type="primary" onClick={handleInsertAtCaret} disabled={!canInsert}>
          Chèn tại con trỏ
        </Button>
        <Button onClick={handleReplaceSelection} disabled={!canInsert || !replaceTarget}>
          Thay đoạn bôi đen
        </Button>
        <Button onClick={handleUndo} disabled={!canUndo}>
          Hoàn tác chèn
        </Button>
      </Space>
    </Card>
  );
}
