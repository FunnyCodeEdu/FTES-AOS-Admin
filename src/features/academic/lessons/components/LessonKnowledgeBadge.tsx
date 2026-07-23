import { Button, Space, Tag, Tooltip, message } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";
import { Can } from "../../../../shared/permissions";
import { useI18n } from "../../../../shared/i18n";
import { adminErrorMessage } from "../../../../shared/api/errors";
import {
  useGenerateLessonKnowledge,
  useLessonKnowledge,
  type LessonKnowledgeStatus,
} from "../api/lessonKnowledge.api";

const STATUS_META: Record<
  LessonKnowledgeStatus,
  { color: string; key: string; processing?: boolean }
> = {
  DOCUMENT_READY: { color: "green", key: "lesson.knowledge.documentReady" },
  COMPLETED: { color: "green", key: "lesson.knowledge.completed" },
  RUNNING: { color: "processing", key: "lesson.knowledge.running", processing: true },
  PENDING: { color: "processing", key: "lesson.knowledge.pending", processing: true },
  FAILED: { color: "red", key: "lesson.knowledge.failed" },
  NONE: { color: "default", key: "lesson.knowledge.none" },
};

/** Tag thuần theo trạng thái knowledge — tái dùng cho badge lẫn cột danh sách (bulk). */
export function KnowledgeStatusTag({ status }: { status: LessonKnowledgeStatus }) {
  const { t } = useI18n();
  const meta = STATUS_META[status] ?? STATUS_META.NONE;
  return (
    <Tag color={meta.color} icon={meta.processing ? <ThunderboltOutlined spin /> : undefined}>
      {t(meta.key)}
    </Tag>
  );
}

interface LessonKnowledgeBadgeProps {
  lessonId: string;
}

/**
 * Badge trạng thái knowledge của bài học (dùng ở trang soạn bài). Bài DOCUMENT: chỉ hiện tag READY
 * khi có nội dung, ẩn hẳn khi chưa có (không có khái niệm "tạo knowledge" cho tài liệu). Bài VIDEO:
 * tag trạng thái + nút "Tạo knowledge" khi NONE/FAILED và có video (gác ai.teacher.use).
 */
export function LessonKnowledgeBadge({ lessonId }: LessonKnowledgeBadgeProps) {
  const { t } = useI18n();
  const { data, isLoading } = useLessonKnowledge(lessonId);
  const generate = useGenerateLessonKnowledge(lessonId);

  if (isLoading || !data) return null;

  // Bài tài liệu: ẩn khi chưa có knowledge; hiện tag READY khi đã có.
  if (data.type === "DOCUMENT") {
    if (data.status !== "DOCUMENT_READY") return null;
    return <KnowledgeStatusTag status={data.status} />;
  }

  const canGenerate =
    data.hasVideo && (data.status === "NONE" || data.status === "FAILED");

  const handleGenerate = () => {
    generate.mutate(undefined, {
      onSuccess: () => message.success(t("lesson.knowledge.generateStarted")),
      onError: (err) => message.error(adminErrorMessage(err)),
    });
  };

  return (
    <Space size="small">
      <KnowledgeStatusTag status={data.status} />
      {canGenerate && (
        <Can permissions={["ai.teacher.use"]}>
          <Tooltip title={t("lesson.knowledge.generateTip")}>
            <Button
              size="small"
              icon={<ThunderboltOutlined />}
              loading={generate.isPending}
              onClick={handleGenerate}
            >
              {t("lesson.knowledge.generate")}
            </Button>
          </Tooltip>
        </Can>
      )}
    </Space>
  );
}
