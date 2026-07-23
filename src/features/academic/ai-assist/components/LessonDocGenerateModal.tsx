// Modal sinh CẢ bài học một phát từ chủ đề (feature F5). Khác LessonAiDraftPanel (chèn tăng dần từng
// đoạn): đây tạo trọn draft rồi cho xem trước → "Chèn vào editor" đẩy body qua onBodyChange (đường
// local của editor: state + draft store). KHÔNG lưu — giảng viên tự rà rồi bấm Lưu của editor.

import { useState } from "react";
import { Alert, Button, Form, Input, Modal, Select, Space, Tag, Typography, message } from "antd";
import { useMutation } from "@tanstack/react-query";
import { adminErrorMessage } from "../../../../shared/api/errors";
import { useI18n } from "../../../../shared/i18n";
import { MarkdownPreview } from "../../lessons/components/MarkdownPreview";
import { generateLessonDocument } from "../api";
import type { LessonDocDraft, LessonDocRequest } from "../types";

interface LessonDocGenerateModalProps {
  open: boolean;
  onClose: () => void;
  /** Chèn body markdown đã sinh vào editor (đường local — không lưu). */
  onInsert: (bodyMd: string) => void;
}

interface FormValues {
  topic: string;
  level?: string;
  language?: string;
  outline?: string;
}

export function LessonDocGenerateModal({ open, onClose, onInsert }: LessonDocGenerateModalProps) {
  const { t } = useI18n();
  const [form] = Form.useForm<FormValues>();
  const [draft, setDraft] = useState<LessonDocDraft | null>(null);

  const levelOptions = [
    { value: "beginner", label: t("lesson.docGen.levelBeginner") },
    { value: "intermediate", label: t("lesson.docGen.levelIntermediate") },
    { value: "advanced", label: t("lesson.docGen.levelAdvanced") },
  ];

  const generate = useMutation<LessonDocDraft, Error, LessonDocRequest>({
    mutationFn: generateLessonDocument,
    onSuccess: (data) => setDraft(data),
    onError: (err) => message.error(adminErrorMessage(err)),
  });

  const handleGenerate = () => {
    form.validateFields().then((values) => {
      const outline = (values.outline ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      generate.mutate({
        topic: values.topic.trim(),
        ...(values.level ? { level: values.level } : {}),
        ...(values.language ? { language: values.language.trim() } : {}),
        ...(outline.length > 0 ? { outline } : {}),
      });
    });
  };

  const handleInsert = () => {
    if (!draft) return;
    onInsert(draft.body_md);
    message.success(t("lesson.docGen.inserted"));
    handleClose();
  };

  const handleClose = () => {
    setDraft(null);
    generate.reset();
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={t("lesson.docGen.title")}
      width={820}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          {t("common.cancel")}
        </Button>,
        <Button key="generate" onClick={handleGenerate} loading={generate.isPending}>
          {draft ? t("lesson.docGen.regenerate") : t("lesson.docGen.generate")}
        </Button>,
        <Button key="insert" type="primary" disabled={!draft} onClick={handleInsert}>
          {t("lesson.docGen.insert")}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="topic"
          label={t("lesson.docGen.topic")}
          rules={[{ required: true, message: t("lesson.docGen.topicRequired") }]}
        >
          <Input placeholder={t("lesson.docGen.topicPlaceholder")} />
        </Form.Item>
        <Space style={{ width: "100%" }} size="middle">
          <Form.Item name="level" label={t("lesson.docGen.level")} style={{ minWidth: 200 }}>
            <Select allowClear placeholder={t("lesson.docGen.levelPlaceholder")} options={levelOptions} />
          </Form.Item>
          <Form.Item name="language" label={t("lesson.docGen.language")} style={{ minWidth: 200 }}>
            <Input placeholder={t("lesson.docGen.languagePlaceholder")} />
          </Form.Item>
        </Space>
        <Form.Item name="outline" label={t("lesson.docGen.outline")}>
          <Input.TextArea
            rows={4}
            placeholder={"Mở đầu\nKhái niệm chính\nVí dụ minh hoạ\nBài tập ôn tập"}
          />
        </Form.Item>
      </Form>

      {generate.isError && (
        <Alert
          type="error"
          showIcon
          message={t("lesson.docGen.failed")}
          description={adminErrorMessage(generate.error)}
          style={{ marginBottom: 12 }}
        />
      )}

      {draft && (
        <div>
          <Space wrap style={{ marginBottom: 8 }}>
            <Typography.Text strong>{draft.title}</Typography.Text>
            <Tag color="blue">{t("lesson.docGen.readingMinutes", { value: String(draft.reading_minutes) })}</Tag>
            <Tag color={draft.grounded ? "green" : "default"}>
              {draft.grounded ? t("lesson.docGen.grounded") : t("lesson.docGen.ungrounded")}
            </Tag>
            {draft.model && <Tag>Model: {draft.model}</Tag>}
          </Space>
          <MarkdownPreview source={draft.body_md} />
        </div>
      )}
    </Modal>
  );
}
