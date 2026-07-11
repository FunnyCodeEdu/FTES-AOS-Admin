import { useState } from "react";
import { Alert, Button, Card, Progress, Space, Tag, Typography, Upload, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "../../../../shared/i18n";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import {
  putVideoToPresignedUrl,
  useCompleteLessonVideoUpload,
  useGetLessonVideoUploadUrl,
  useLessonPreview,
} from "../api/lessons.api";
import { lessonsKeys } from "../api/lessons.keys";

interface LessonVideoUploadProps {
  lessonId: string;
  disabled?: boolean;
}

// Nhãn videoStatus BE trả về (UPLOADING->pending, PROCESSING->processing, READY->ready, else error).
const STATUS_COLOR: Record<string, string> = {
  pending: "orange",
  processing: "blue",
  ready: "green",
  error: "red",
};

export function LessonVideoUpload({ lessonId, disabled }: LessonVideoUploadProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: preview } = useLessonPreview(lessonId, "VIDEO");
  const getUploadUrl = useGetLessonVideoUploadUrl(lessonId);
  const completeUpload = useCompleteLessonVideoUpload();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const busy = uploading || getUploadUrl.isPending || completeUpload.isPending;

  const handleFile = async (file: File) => {
    setUploading(true);
    setProgress(0);
    // contentType tính 1 lần, dùng CHUNG cho step 1 (ký) và step 2 (PUT) để chữ ký khớp header.
    const contentType = file.type || "video/mp4";
    try {
      // 1. Xin presigned PUT URL + videoId.
      const { videoId, url } = await getUploadUrl.mutateAsync({
        filename: file.name,
        contentType,
      });
      // 2. PUT bytes thẳng lên object storage (axios trần, không auth/envelope) + progress.
      await putVideoToPresignedUrl(url, file, contentType, setProgress);
      // 3. Báo BE hoàn tất → video PROCESSING + transcode.
      await completeUpload.mutateAsync({ videoId });
      // 4. Invalidate để videoStatus mới (processing) hiện lên.
      await queryClient.invalidateQueries({ queryKey: lessonsKeys.preview(lessonId) });
      message.success(t("lesson.video.uploadSuccess"));
    } catch (error) {
      handleAdminMutationError(error);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const status = preview?.videoStatus;

  return (
    <Card title={t("lesson.video.title")} style={{ maxWidth: 560 }}>
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Space>
          <Typography.Text>{t("lesson.video.currentStatus")}</Typography.Text>
          {status ? (
            <Tag color={STATUS_COLOR[status] ?? "default"}>
              {t(`lesson.video.status.${status}`)}
            </Tag>
          ) : (
            <Tag>{t("lesson.video.status.none")}</Tag>
          )}
        </Space>

        <Upload
          accept="video/*"
          showUploadList={false}
          maxCount={1}
          beforeUpload={(file) => {
            void handleFile(file);
            return false; // Tự xử lý upload — ngăn AntD tự POST.
          }}
          disabled={disabled || busy}
        >
          <Button icon={<UploadOutlined />} loading={busy} disabled={disabled || busy}>
            {t("lesson.video.select")}
          </Button>
        </Upload>

        {uploading && <Progress percent={progress} size="small" status="active" />}

        <Typography.Text type="secondary">{t("lesson.video.hint")}</Typography.Text>

        {disabled && <Alert type="info" showIcon message={t("lesson.video.readonly")} />}
      </Space>
    </Card>
  );
}
