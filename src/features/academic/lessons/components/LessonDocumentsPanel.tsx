import { Button, Card, Empty, List, Popconfirm, Space, Typography, Upload, message } from "antd";
import { DeleteOutlined, LinkOutlined, UploadOutlined } from "@ant-design/icons";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import {
  useDeleteLessonDocument,
  useLessonDocuments,
  useUploadLessonDocument,
} from "../api/lessons.api";

interface LessonDocumentsPanelProps {
  lessonId: string;
  disabled?: boolean;
}

function formatSize(bytes?: number | null): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Slide / tài liệu đính kèm của bài học. Upload đi thẳng lên BE (multipart) — BE đẩy sang storage và
 * trả URL xem được; danh sách đọc qua đường soạn bài (`/documents/manage`, gate ownership) nên chủ
 * khoá thấy tài liệu của mình mà không cần enrollment.
 */
export function LessonDocumentsPanel({ lessonId, disabled }: LessonDocumentsPanelProps) {
  const { data: documents, isLoading } = useLessonDocuments(lessonId);
  const upload = useUploadLessonDocument(lessonId);
  const remove = useDeleteLessonDocument(lessonId);

  const handleFile = async (file: File) => {
    try {
      await upload.mutateAsync({ file, title: file.name });
      message.success("Đã tải tài liệu lên");
    } catch (error) {
      handleAdminMutationError(error);
    }
  };

  return (
    <Card
      title="Slide / tài liệu"
      extra={
        <Upload
          accept=".pdf,.ppt,.pptx,.doc,.docx,.zip"
          showUploadList={false}
          maxCount={1}
          beforeUpload={(file) => {
            void handleFile(file);
            return false; // tự upload — chặn AntD tự POST
          }}
          disabled={disabled || upload.isPending}
        >
          <Button icon={<UploadOutlined />} loading={upload.isPending} disabled={disabled}>
            Tải lên
          </Button>
        </Upload>
      }
    >
      {!isLoading && (documents?.length ?? 0) === 0 ? (
        <Empty description="Chưa có slide / tài liệu" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          loading={isLoading}
          dataSource={documents ?? []}
          renderItem={(doc) => (
            <List.Item
              actions={[
                <Button
                  key="open"
                  size="small"
                  icon={<LinkOutlined />}
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Mở
                </Button>,
                <Popconfirm
                  key="del"
                  title="Gỡ tài liệu này?"
                  okText="Gỡ"
                  cancelText="Huỷ"
                  onConfirm={() => remove.mutate({ documentId: doc.id })}
                  disabled={disabled}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} disabled={disabled} />
                </Popconfirm>,
              ]}
            >
              <Space direction="vertical" size={0}>
                <Typography.Text>{doc.title}</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {[doc.mimeType, formatSize(doc.sizeBytes)].filter(Boolean).join(" · ")}
                </Typography.Text>
              </Space>
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
