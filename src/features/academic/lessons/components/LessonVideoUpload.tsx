import { useState } from "react";
import { Alert, Button, Card, Progress, Space, Tag, Tooltip, Typography, Upload, message } from "antd";
import { InfoCircleOutlined, UploadOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "../../../../shared/i18n";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import {
  postVideoToUploadService,
  useCompleteLessonVideoUpload,
  useGetLessonVideoUploadUrl,
  useLessonPreview,
} from "../api/lessons.api";
import { lessonsKeys } from "../api/lessons.keys";

interface LessonVideoUploadProps {
  lessonId: string;
  /** Tên bài học — gửi làm `title` (optional) cho upload service. */
  lessonTitle?: string;
  disabled?: boolean;
}

// Nhãn videoStatus BE trả về (UPLOADING->pending, PROCESSING->processing, READY->ready, else error).
const STATUS_COLOR: Record<string, string> = {
  pending: "orange",
  processing: "blue",
  ready: "green",
  error: "red",
};

export function LessonVideoUpload({ lessonId, lessonTitle, disabled }: LessonVideoUploadProps) {
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
    const contentType = file.type || "video/mp4";
    try {
      // 1. Xin upload URL + videoId (url = {uploadBaseUrl}/api/videos).
      const { videoId, url } = await getUploadUrl.mutateAsync({
        filename: file.name,
        contentType,
      });
      // 2. POST multipart lên upload service (upload.ftes.vn): gửi videoId của BE (HLS keyed on it)
      //    + title = tên bài học; Bearer token gắn từ auth store; progress cập nhật thanh tiến trình.
      await postVideoToUploadService(url, file, videoId, lessonTitle, setProgress);
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

        <Tooltip title={t("lesson.video.corsNote")}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            <InfoCircleOutlined style={{ marginRight: 4 }} />
            {t("lesson.video.corsNote")}
          </Typography.Text>
        </Tooltip>

        {disabled && <Alert type="info" showIcon message={t("lesson.video.readonly")} />}
      </Space>
    </Card>
  );
}
