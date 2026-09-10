import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Col, Input, Modal, Row, Space, Typography, message } from "antd";
import { FileAddOutlined, RobotOutlined, SaveOutlined, ScissorOutlined } from "@ant-design/icons";
import { useI18n } from "../../../../shared/i18n";
import { ApiError } from "../../../../shared/api/client";
import { Can } from "../../../../shared/permissions";
import type { LessonContent } from "../types";
import { useLessonDraftStore } from "../store/lessonDraftStore";
import { useUpdateLessonContent } from "../api/lessons.api";
import { MarkdownPreview } from "./MarkdownPreview";
import { LessonAiDraftPanel } from "../../ai-assist/components/LessonAiDraftPanel";
import { ChallengeGenerateModal } from "../../ai-assist/components/ChallengeGenerateModal";
import { LessonDocGenerateModal } from "../../ai-assist/components/LessonDocGenerateModal";

interface LessonContentEditorProps {
  lesson: LessonContent;
  disabled?: boolean;
}

const PREVIEW_MARKER = "<!-- ftes:preview-end -->";
const MARKER_REGEX = /<!-- ftes:preview-end -->/g;

/** Ngồi im bao lâu thì tự lưu (ms). 1,5s: đủ để không bắn request theo từng phím, đủ nhanh để
 *  người soạn không kịp lo mình chưa lưu. */
const AUTOSAVE_DELAY_MS = 1500;

export function LessonContentEditor({ lesson, disabled }: LessonContentEditorProps) {
  const { t } = useI18n();
  const draft = useLessonDraftStore((s) => s.drafts[lesson.lessonId]);
  const setDraft = useLessonDraftStore((s) => s.setDraft);
  const acknowledgeSaved = useLessonDraftStore((s) => s.acknowledgeSaved);
  const clearDraft = useLessonDraftStore((s) => s.clearDraft);
  const [body, setBody] = useState(draft?.body ?? lesson.body);
  const [aiOpen, setAiOpen] = useState(false);
  const [docGenOpen, setDocGenOpen] = useState(false);
  const [challengeGenOpen, setChallengeGenOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Chỉ lấy hai field cần dùng. Object trả về từ useMutation đổi identity theo mỗi trạng thái
  // pending/error; đưa cả object vào dependency của `save` sẽ khiến effect autosave tự hẹn lại sau
  // MỖI lỗi, rồi bắn cùng request lỗi mãi mãi dù người dùng không gõ thêm.
  const { mutateAsync: updateContent, isPending: isSaving } = useUpdateLessonContent(lesson.lessonId);

  // --- Tự lưu ---------------------------------------------------------------
  // Trước đây lúc nào cũng phải bấm Lưu. Nay gõ xong ngồi im 1,5 giây là tự lưu; nút Lưu vẫn còn
  // nhưng đổi vai thành "lưu ngay" cho người quen bấm.
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Mốc sửa của server, cập nhật sau MỖI lần lưu thành công.
  const updatedAtRef = useRef<string | null>(draft?.baseUpdatedAt ?? lesson.updatedAt ?? null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Nội dung của lần lưu gần nhất — so để không gửi lại y nguyên khi người dùng chỉ di chuột.
  const lastSavedBody = useRef(draft?.baseBody ?? lesson.body);
  // Không cho nút Lưu / visibilitychange tạo request song song trước khi React kịp render isSaving.
  const inFlightBody = useRef<string | null>(null);
  // Một body đã bị server từ chối chỉ tự lưu đúng một lần. Manual Save vẫn được retry tường minh.
  const rejectedAutosaveBody = useRef<string | null>(null);
  // 409 nghĩa là base đã cũ; thay body không làm base mới lại. Dừng hẳn autosave đến khi reload.
  const conflictRef = useRef(false);
  const activeLessonIdRef = useRef(lesson.lessonId);
  const mountedRef = useRef(true);

  useEffect(() => {
    // StrictMode chạy setup → cleanup → setup trong development, nên phải đặt lại true
    // ở mỗi setup thay vì chỉ khởi tạo ref một lần.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    activeLessonIdRef.current = lesson.lessonId;
    rejectedAutosaveBody.current = null;
    conflictRef.current = false;
    setConflict(false);
    setSaveError(null);
    setSavedAt(null);
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
  }, [lesson.lessonId]);

  useEffect(() => {
    const nextBody = draft?.body ?? lesson.body;
    setBody(nextBody);
    // Draft mang theo base riêng. Refetch nền có thấy phiên bản server mới cũng KHÔNG được nhảy
    // expectedUpdatedAt lên đó, nếu không request sau sẽ vô tình đè sửa của người khác thay vì 409.
    updatedAtRef.current = draft?.baseUpdatedAt ?? lesson.updatedAt ?? null;
    lastSavedBody.current = draft?.baseBody ?? lesson.body;
  }, [lesson.body, lesson.lessonId, lesson.updatedAt, draft]);

  useEffect(() => {
    // acknowledgeSaved cố ý giữ snapshot sạch cho đến khi cache theo kịp, tránh flash/nạp ngược
    // body cũ. Chỉ lúc cả body lẫn mốc server đã khớp mới thật sự bỏ draft khỏi store.
    if (
      draft &&
      draft.body === draft.baseBody &&
      lesson.body === draft.body &&
      (lesson.updatedAt ?? null) === draft.baseUpdatedAt
    ) {
      clearDraft(lesson.lessonId);
    }
  }, [draft, lesson.body, lesson.lessonId, lesson.updatedAt, clearDraft]);

  const save = useCallback(
    (value: string, origin: "auto" | "manual") => {
      // BE khai @NotBlank bodyMd. Chặn ngay tại editor để không biến một draft rỗng thành chuỗi
      // toast "Validation failed"; lời giải thích cụ thể được render inline phía dưới toolbar.
      if (disabled || !value.trim() || value === lastSavedBody.current) return;
      if (origin === "auto" && value === rejectedAutosaveBody.current) return;
      if (origin === "auto" && conflictRef.current) return;
      if (inFlightBody.current !== null) return;

      const targetLessonId = lesson.lessonId;
      inFlightBody.current = value;
      setSaveError(null);
      // Dù editor unmount khi request đang bay, promise này vẫn chạy tới cuối. Callback
      // truyền cho `mutate(...)` thì TanStack Query có thể bỏ qua sau unmount; server đã lưu
      // nhưng draft giữ base cũ sẽ tạo 409 giả khi mở lại bài.
      void updateContent({
        body: value,
        lessonType: lesson.lessonType,
        expectedUpdatedAt: updatedAtRef.current,
      })
        .then((saved) => {
          acknowledgeSaved(targetLessonId, value, saved.updatedAt);
          // Route param có thể đổi mà component không remount. Request cũ vẫn được ghi nhận cho
          // draft cũ, nhưng tuyệt đối không được đổi trạng thái/refs của lesson mới đang mở.
          if (!mountedRef.current || activeLessonIdRef.current !== targetLessonId) return;
          updatedAtRef.current = saved.updatedAt;
          lastSavedBody.current = value;
          rejectedAutosaveBody.current = null;
          conflictRef.current = false;
          setSavedAt(new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }));
          setConflict(false);
          setSaveError(null);
        })
        .catch((caught: unknown) => {
          if (!mountedRef.current || activeLessonIdRef.current !== targetLessonId) return;
          const err = caught instanceof Error ? caught : new Error(String(caught));
          rejectedAutosaveBody.current = value;
          // 409: người khác vừa sửa bài này. KHÔNG đè — báo để người soạn tự quyết.
          if (
            (err instanceof ApiError && err.errorCode === "LESSON_CONTENT_STALE") ||
            err.message.includes("LESSON_CONTENT_STALE")
          ) {
            conflictRef.current = true;
            setConflict(true);
            return;
          }
          if (
            (err instanceof ApiError && err.errorCode === "LESSON_TYPE_MISMATCH") ||
            err.message === "LESSON_TYPE_MISMATCH"
          ) {
            const errorMessage = t("lesson.editor.wrongType");
            setSaveError(errorMessage);
            message.error(errorMessage);
            return;
          }
          const errorMessage = err.message || t("common.save") + " thất bại";
          setSaveError(errorMessage);
          message.error(errorMessage);
        })
        .finally(() => {
          if (inFlightBody.current === value) inFlightBody.current = null;
        });
    },
    [disabled, updateContent, lesson.lessonType, lesson.lessonId, acknowledgeSaved, t]
  );

  // Hẹn giờ tự lưu sau mỗi lần gõ; gõ tiếp thì dời hẹn.
  useEffect(() => {
    if (
      disabled ||
      isSaving ||
      !body.trim() ||
      body === lastSavedBody.current ||
      body === rejectedAutosaveBody.current ||
      conflict
    ) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => save(body, "auto"), AUTOSAVE_DELAY_MS);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [body, disabled, isSaving, conflict, save]);

  // Rời tab / đóng tab: lưu ngay, đừng đợi hết 1,5 giây. Dùng visibilitychange chứ KHÔNG dùng
  // beforeunload — Safari bỏ qua beforeunload nên người dùng Mac sẽ mất phần vừa gõ.
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === "hidden") save(body, "auto");
    };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, [body, save]);

  const handleChange = (value: string) => {
    if (value !== rejectedAutosaveBody.current) rejectedAutosaveBody.current = null;
    setSaveError(null);
    setBody(value);
    setDraft(lesson.lessonId, value, lastSavedBody.current, updatedAtRef.current);
  };

  const handleInsertMarker = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? body.length;
    const before = body.slice(0, start);
    const after = body.slice(start);

    const hasMarker = body.includes(PREVIEW_MARKER);
    if (hasMarker) {
      Modal.confirm({
        title: t("lesson.editor.moveCutConfirm"),
        content: t("lesson.editor.moveCutDesc"),
        okText: t("lesson.editor.moveCutOk"),
        cancelText: t("common.cancel"),
        onOk: () => {
          const beforeWithoutMarker = body.slice(0, start).replace(MARKER_REGEX, "");
          const afterWithoutMarker = body.slice(start).replace(MARKER_REGEX, "");
          const newBody = `${beforeWithoutMarker.trimEnd()}\n${PREVIEW_MARKER}\n${afterWithoutMarker.trimStart()}`;
          handleChange(newBody);
        },
      });
    } else {
      const newBody = `${before.trimEnd()}\n${PREVIEW_MARKER}\n${after.trimStart()}`;
      handleChange(newBody);
    }
  };

  const handleSave = () => save(body, "manual");

  const emptyContent = !body.trim();

  if (lesson.lessonType !== "DOCUMENT") {
    return (
      <Alert
        type="warning"
        message={t("lesson.editor.wrongType")}
        description="Editor nội dung markdown chỉ khả dụng cho bài học dạng văn bản."
      />
    );
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ScissorOutlined />}
          onClick={handleInsertMarker}
          disabled={disabled || isSaving}
        >
          {t("lesson.editor.insertCut")}
        </Button>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={isSaving}
          disabled={disabled || emptyContent}
        >
          {t("lesson.editor.save")}
        </Button>
        <Can permissions={["ai.teacher.use"]}>
          <Button
            icon={<RobotOutlined />}
            onClick={() => setAiOpen((v) => !v)}
            type={aiOpen ? "default" : "dashed"}
            disabled={disabled || isSaving}
          >
            {t("lesson.editor.aiAssist")}
          </Button>
          <Button
            icon={<FileAddOutlined />}
            onClick={() => setDocGenOpen(true)}
            type="dashed"
            disabled={disabled || isSaving}
          >
            {t("lesson.editor.docGenerate")}
          </Button>
          <Button
            icon={<RobotOutlined />}
            onClick={() => setChallengeGenOpen(true)}
            type="dashed"
            disabled={disabled}
          >
            {t("lesson.editor.challengeGenerate")}
          </Button>
        </Can>
        {emptyContent ? (
          <Typography.Text type="danger">{t("lesson.editor.emptyContent")}</Typography.Text>
        ) : conflict ? (
          <Typography.Text type="danger">{t("lesson.editor.staleConflict")}</Typography.Text>
        ) : saveError ? (
          <Typography.Text type="danger">{saveError}</Typography.Text>
        ) : isSaving ? (
          <Typography.Text type="secondary">{t("lesson.editor.saving")}</Typography.Text>
        ) : body !== lastSavedBody.current ? (
          <Typography.Text type="warning">{t("lesson.editor.unsaved")}</Typography.Text>
        ) : savedAt ? (
          <Typography.Text type="success">
            {t("lesson.editor.savedAt").replace("{time}", savedAt)}
          </Typography.Text>
        ) : null}
      </Space>

      <ChallengeGenerateModal
        open={challengeGenOpen}
        onClose={() => setChallengeGenOpen(false)}
        lessonId={lesson.lessonId}
      />

      <LessonDocGenerateModal
        open={docGenOpen}
        onClose={() => setDocGenOpen(false)}
        onInsert={handleChange}
      />

      {aiOpen && (
        <LessonAiDraftPanel
          key={lesson.lessonId}
          lessonId={lesson.lessonId}
          body={body}
          onBodyChange={handleChange}
          textareaRef={textareaRef}
          disabled={disabled || isSaving}
          onClose={() => setAiOpen(false)}
        />
      )}

      <Row gutter={16}>
        <Col span={12}>
          <Card title={t("lesson.editor.source")} size="small">
            <Input.TextArea
              ref={textareaRef}
              value={body}
              onChange={(e) => handleChange(e.target.value)}
              rows={20}
              disabled={disabled || isSaving}
              style={{ fontFamily: "monospace" }}
              placeholder={t("lesson.editor.placeholder")}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title={t("lesson.editor.preview")} size="small">
            <MarkdownPreview source={body} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
