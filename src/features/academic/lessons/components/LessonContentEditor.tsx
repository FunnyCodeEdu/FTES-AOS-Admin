import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Col, Input, Modal, Row, Space, Typography, message } from "antd";
import { FileAddOutlined, RobotOutlined, SaveOutlined, ScissorOutlined } from "@ant-design/icons";
import { useI18n } from "../../../../shared/i18n";
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
  const draftBody = useLessonDraftStore((s) => s.drafts[lesson.lessonId]);
  const setDraft = useLessonDraftStore((s) => s.setDraft);
  const clearDraft = useLessonDraftStore((s) => s.clearDraft);
  const [body, setBody] = useState(lesson.body);
  const [aiOpen, setAiOpen] = useState(false);
  const [docGenOpen, setDocGenOpen] = useState(false);
  const [challengeGenOpen, setChallengeGenOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const update = useUpdateLessonContent(lesson.lessonId);

  // --- Tự lưu ---------------------------------------------------------------
  // Trước đây lúc nào cũng phải bấm Lưu. Nay gõ xong ngồi im 1,5 giây là tự lưu; nút Lưu vẫn còn
  // nhưng đổi vai thành "lưu ngay" cho người quen bấm.
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  // Mốc sửa của server, cập nhật sau MỖI lần lưu thành công.
  const updatedAtRef = useRef<string | null>(lesson.updatedAt ?? null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Nội dung của lần lưu gần nhất — so để không gửi lại y nguyên khi người dùng chỉ di chuột.
  const lastSavedBody = useRef(lesson.body);

  useEffect(() => {
    setBody(draftBody ?? lesson.body);
  }, [lesson.body, lesson.lessonId, draftBody]);

  useEffect(() => {
    updatedAtRef.current = lesson.updatedAt ?? null;
    lastSavedBody.current = lesson.body;
  }, [lesson.lessonId, lesson.updatedAt, lesson.body]);

  const save = useCallback(
    (value: string) => {
      if (disabled || value === lastSavedBody.current) return;
      update.mutate(
        { body: value, lessonType: lesson.lessonType, expectedUpdatedAt: updatedAtRef.current },
        {
          onSuccess: (saved) => {
            updatedAtRef.current = saved.updatedAt;
            lastSavedBody.current = value;
            setSavedAt(new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }));
            setConflict(false);
            clearDraft(lesson.lessonId);
          },
          onError: (err: Error) => {
            // 409: người khác vừa sửa bài này. KHÔNG đè — báo để người soạn tự quyết.
            if (err.message.includes("LESSON_CONTENT_STALE")) {
              setConflict(true);
              return;
            }
            if (err.message === "LESSON_TYPE_MISMATCH") {
              message.error(t("lesson.editor.wrongType"));
              return;
            }
            message.error(err.message || t("common.save") + " thất bại");
          },
        }
      );
    },
    [disabled, update, lesson.lessonType, lesson.lessonId, clearDraft, t]
  );

  // Hẹn giờ tự lưu sau mỗi lần gõ; gõ tiếp thì dời hẹn.
  useEffect(() => {
    if (disabled || body === lastSavedBody.current) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => save(body), AUTOSAVE_DELAY_MS);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [body, disabled, save]);

  // Rời tab / đóng tab: lưu ngay, đừng đợi hết 1,5 giây. Dùng visibilitychange chứ KHÔNG dùng
  // beforeunload — Safari bỏ qua beforeunload nên người dùng Mac sẽ mất phần vừa gõ.
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === "hidden") save(body);
    };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, [body, save]);

  const handleChange = (value: string) => {
    setBody(value);
    setDraft(lesson.lessonId, value);
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

  const handleSave = () => save(body);

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
          disabled={disabled || update.isPending}
        >
          {t("lesson.editor.insertCut")}
        </Button>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={update.isPending}
          disabled={disabled}
        >
          {t("lesson.editor.save")}
        </Button>
        <Can permissions={["ai.teacher.use"]}>
          <Button
            icon={<RobotOutlined />}
            onClick={() => setAiOpen((v) => !v)}
            type={aiOpen ? "default" : "dashed"}
            disabled={disabled || update.isPending}
          >
            {t("lesson.editor.aiAssist")}
          </Button>
          <Button
            icon={<FileAddOutlined />}
            onClick={() => setDocGenOpen(true)}
            type="dashed"
            disabled={disabled || update.isPending}
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
        {conflict ? (
          <Typography.Text type="danger">{t("lesson.editor.staleConflict")}</Typography.Text>
        ) : update.isPending ? (
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
          disabled={disabled || update.isPending}
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
              disabled={disabled || update.isPending}
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
