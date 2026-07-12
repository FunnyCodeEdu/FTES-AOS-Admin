import { Drawer, Empty, List, Skeleton, Tag, Typography } from "antd";
import { useAdminLessonContent } from "../../lessons/api/lessons.api";
import { MarkdownPreview } from "../../lessons/components/MarkdownPreview";

interface LessonContentDrawerProps {
  lessonId: string | null;
  lessonTitle?: string;
  open: boolean;
  onClose: () => void;
}

const videoStatusLabels: Record<string, { text: string; color: string }> = {
  PENDING: { text: "Đang tải lên", color: "orange" },
  PROCESSING: { text: "Đang xử lý", color: "blue" },
  READY: { text: "Sẵn sàng", color: "green" },
  ERROR: { text: "Lỗi", color: "red" },
};

export function LessonContentDrawer({ lessonId, lessonTitle, open, onClose }: LessonContentDrawerProps) {
  const { data, isLoading, isError, error } = useAdminLessonContent(lessonId ?? undefined);

  const statusKey = data?.videoStatus ?? "";
  const status = videoStatusLabels[statusKey] ?? { text: statusKey || "—", color: "default" };

  return (
    <Drawer
      title={`Nội dung: ${lessonTitle || "Bài học"}`}
      width={720}
      open={open}
      onClose={onClose}
    >
      {isLoading && <Skeleton active paragraph={{ rows: 8 }} />}

      {isError && (
        <Typography.Text type="danger">
          Không thể tải nội dung: {error?.message}
        </Typography.Text>
      )}

      {!isLoading && data && (
        <>
          <Typography.Paragraph>
            <Typography.Text type="secondary">Trạng thái video: </Typography.Text>
            <Tag color={status.color}>{status.text}</Tag>
          </Typography.Paragraph>

          {data.bodyMd?.trim() ? (
            <MarkdownPreview source={data.bodyMd} />
          ) : (
            <Empty description="Bài học chưa có nội dung markdown" />
          )}

          {data.documents.length > 0 && (
            <>
              <Typography.Title level={5} style={{ marginTop: 24 }}>
                Tài liệu đính kèm
              </Typography.Title>
              <List
                bordered
                dataSource={data.documents}
                renderItem={(doc) => (
                  <List.Item>
                    <Typography.Text code>{doc.mimeType}</Typography.Text>{" "}
                    {doc.fileName}
                  </List.Item>
                )}
              />
            </>
          )}
        </>
      )}
    </Drawer>
  );
}
