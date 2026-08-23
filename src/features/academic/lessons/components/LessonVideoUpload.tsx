import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Divider,
  Input,
  Progress,
  Space,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from "antd";
import { CloudDownloadOutlined, InfoCircleOutlined, UploadOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "../../../../shared/i18n";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import {
  VIDEO_INGEST_ERROR_HINT,
  postVideoToUploadService,
  useAttachUploadedVideo,
  UPLOAD_VIDEO_ENDPOINT,
  useIngestLessonVideoFromUrl,
  useLessonPreview,
  useLessonVideoIngestStatus,
  useSetLessonVideoRef,
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
  const attachUploaded = useAttachUploadedVideo(lessonId);
  const setVideoRef = useSetLessonVideoRef(lessonId);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoRefInput, setVideoRefInput] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const ingestFromUrl = useIngestLessonVideoFromUrl(lessonId);
  const { data: ingest } = useLessonVideoIngestStatus(lessonId);

  const busy = uploading || attachUploaded.isPending || setVideoRef.isPending;

  const handleSetVideoRef = async () => {
    const ref = videoRefInput.trim();
    if (!ref) return;
    try {
      await setVideoRef.mutateAsync({ videoRef: ref });
      await queryClient.invalidateQueries({ queryKey: lessonsKeys.preview(lessonId) });
      setVideoRefInput("");
      message.success("Đã gắn video vào bài học");
    } catch (error) {
      handleAdminMutationError(error);
    }
  };

  const handleIngestFromUrl = async () => {
    const url = youtubeUrl.trim();
    if (!url || !rightsConfirmed) return;
    try {
      await ingestFromUrl.mutateAsync({ sourceUrl: url, rightsConfirmed });
      setYoutubeUrl("");
      setRightsConfirmed(false);
      message.success("Đã nhận link. Hệ thống đang tải video về, bạn có thể rời trang.");
    } catch (error) {
      handleAdminMutationError(error);
    }
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    setProgress(0);
    try {
      // 1. POST multipart THẲNG lên dịch vụ upload. Id phát được là id DỊCH VỤ cấp lúc nhận file —
      //    không còn bước "xin videoId" từ BE (đường cũ, dịch vụ hiện tại không dùng id của ai khác).
      const result = await postVideoToUploadService(
        UPLOAD_VIDEO_ENDPOINT,
        file,
        lessonId,
        lessonTitle,
        setProgress
      );
      if (!result?.videoId) {
        throw new Error("Dịch vụ upload không trả về videoId");
      }
      // 2. Báo BE gắn vào bài: storage_key `aosvideo:<id>`, trạng thái UPLOADING cho tới khi chuyển
      //    mã xong (đánh READY sớm = người học mở ra gặp trình phát trắng).
      await attachUploaded.mutateAsync({ videoId: result.videoId });
      // 3. Invalidate để videoStatus mới hiện lên.
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

        {/* Đường thứ hai: video ĐÃ có sẵn — id upload.ftes.vn (video_xxx) hoặc link YouTube. */}
        <Space.Compact style={{ width: "100%" }}>
          <Input
            value={videoRefInput}
            onChange={(e) => setVideoRefInput(e.target.value)}
            onPressEnter={handleSetVideoRef}
            placeholder="ID video (video_xxx) hoặc link YouTube"
            disabled={disabled || busy}
          />
          <Button
            onClick={handleSetVideoRef}
            loading={setVideoRef.isPending}
            disabled={disabled || busy || !videoRefInput.trim()}
          >
            Gắn video
          </Button>
        </Space.Compact>

        <Divider style={{ margin: "4px 0" }} plain>
          hoặc
        </Divider>

        {/* Đường thứ ba: dán link YouTube, hệ tự kéo về hạ tầng của FTES.
            Khác ô "Gắn video" phía trên ở chỗ căn bản: ô kia LƯU link YouTube làm nguồn, nên bài học
            phụ thuộc vào nội dung nằm ngoài tầm với — người đăng để riêng tư là bài chết. Đường này
            kéo hẳn về, phát bằng vé ký, cắt xem thử ở server, và có phụ đề cho AI dùng. */}
        <Space direction="vertical" style={{ width: "100%" }} size="small">
          <Typography.Text strong>Tải video từ YouTube về hệ thống</Typography.Text>
          <Input
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://youtu.be/... hoặc https://youtube.com/watch?v=..."
            disabled={disabled || busy || ingestFromUrl.isPending}
            allowClear
          />
          <Checkbox
            checked={rightsConfirmed}
            onChange={(e) => setRightsConfirmed(e.target.checked)}
            disabled={disabled || busy || ingestFromUrl.isPending}
          >
            Tôi xác nhận có quyền sử dụng video này
          </Checkbox>
          <Button
            type="primary"
            icon={<CloudDownloadOutlined />}
            onClick={handleIngestFromUrl}
            loading={ingestFromUrl.isPending}
            disabled={disabled || busy || !youtubeUrl.trim() || !rightsConfirmed}
          >
            Tải về hệ thống
          </Button>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Video được tải ở chất lượng cao nhất tới 1080p, tự sinh phụ đề, và phát bằng hạ tầng của
            FTES — không nhúng YouTube. Video dài có thể mất vài chục phút.
          </Typography.Text>

          {/* Trạng thái phải PHÂN BIỆT được "đang chạy" với "hỏng hẳn": bảo người ta chờ thêm về một
              video sẽ không bao giờ xong là kéo mọi câu hỏi về phía kỹ thuật thay vì về phía họ. */}
          {ingest && (ingest.status === "FETCHING" || ingest.status === "UPLOADED") && (
            <Alert
              type="info"
              showIcon
              message="Đang tải video về từ YouTube…"
              description="Bạn có thể rời trang, hệ thống vẫn chạy tiếp."
            />
          )}
          {ingest?.status === "PROCESSING" && (
            <Alert type="info" showIcon message="Đang chuyển mã và sinh phụ đề…" />
          )}
          {ingest?.status === "READY" && (
            <Alert type="success" showIcon message="Video đã sẵn sàng trên hệ thống" />
          )}
          {ingest?.status === "FAILED" && (
            <Alert
              type="error"
              showIcon
              message="Không tải được video này"
              description={
                (ingest.errorCode && VIDEO_INGEST_ERROR_HINT[ingest.errorCode]) ??
                ingest.message ??
                VIDEO_INGEST_ERROR_HINT.FETCH_FAILED
              }
            />
          )}
        </Space>

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
