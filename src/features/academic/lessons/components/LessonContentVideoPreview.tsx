import { Space, Typography } from "antd";
import { useI18n } from "../../../../shared/i18n";
import { LessonVideoPreview } from "./LessonVideoPreview";
import { MarkdownPreview } from "./MarkdownPreview";

interface LessonContentVideoPreviewProps {
  lessonId: string;
  /** Markdown hiện tại (bản nháp đang soạn hoặc bản đã lưu). */
  body: string;
}

/**
 * Xem trước bài học như học viên thấy: video (nếu bài có stream) xếp trên, nội dung markdown xếp
 * dưới. Chỉ đọc. Phần video tự ẩn (hideWhenEmpty) khi bài không phải VIDEO / không có bản xem trước
 * — trang soạn bài không biết chắc loại bài nên để LessonVideoPreview tự quyết theo manifest stream.
 */
export function LessonContentVideoPreview({ lessonId, body }: LessonContentVideoPreviewProps) {
  const { t } = useI18n();
  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <LessonVideoPreview lessonId={lessonId} hideWhenEmpty />
      <div>
        <Typography.Text type="secondary">{t("lesson.contentPreview.content")}</Typography.Text>
        <MarkdownPreview source={body} />
      </div>
    </Space>
  );
}
