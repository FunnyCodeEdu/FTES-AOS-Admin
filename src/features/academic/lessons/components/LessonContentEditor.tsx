import { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Col, Input, Modal, Row, Space, Typography, message } from "antd";
import { RobotOutlined, SaveOutlined, ScissorOutlined } from "@ant-design/icons";
import { useI18n } from "../../../../shared/i18n";
import { Can } from "../../../../shared/permissions";
import type { LessonContent } from "../types";
import { useLessonDraftStore } from "../store/lessonDraftStore";
import { useUpdateLessonContent } from "../api/lessons.api";
import { MarkdownPreview } from "./MarkdownPreview";
import { LessonAiDraftPanel } from "../../ai-assist/components/LessonAiDraftPanel";

interface LessonContentEditorProps {
  lesson: LessonContent;
  disabled?: boolean;
}

const PREVIEW_MARKER = "<!-- ftes:preview-end -->";
const MARKER_REGEX = /<!-- ftes:preview-end -->/g;

export function LessonContentEditor({ lesson, disabled }: LessonContentEditorProps) {
  const { t } = useI18n();
  const draftBody = useLessonDraftStore((s) => s.drafts[lesson.lessonId]);
  const setDraft = useLessonDraftStore((s) => s.setDraft);
  const clearDraft = useLessonDraftStore((s) => s.clearDraft);
  const [body, setBody] = useState(lesson.body);
  const [aiOpen, setAiOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const update = useUpdateLessonContent(lesson.lessonId);

  useEffect(() => {
    setBody(draftBody ?? lesson.body);
  }, [lesson.body, lesson.lessonId, draftBody]);

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

  const handleSave = () => {
    update.mutate(
      { body, lessonType: lesson.lessonType },
      {
        onSuccess: () => {
          message.success(t("lesson.editor.saveSuccess"));
          clearDraft(lesson.lessonId);
        },
        onError: (err: Error) => {
          if (err.message === "LESSON_TYPE_MISMATCH") {
            message.error(t("lesson.editor.wrongType"));
          } else {
            message.error(err.message || t("common.save") + " thất bại");
          }
        },
      }
    );
  };

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
            Trợ lý AI
          </Button>
        </Can>
        {body !== lesson.body && (
          <Typography.Text type="warning">{t("lesson.editor.unsaved")}</Typography.Text>
        )}
      </Space>

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
