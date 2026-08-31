import { Descriptions, Drawer, Tag, Typography } from "antd";
import { useIsMobile } from "../../../../shared/hooks/useIsMobile";
import { CLIP_STATUS_LABEL, clipStatusColor, formatDateTime } from "../format";
import { formatBytes, formatDurationSeconds, formatMmSs } from "../timecode";
import type { Clip } from "../types";

export interface ClipDetailDrawerProps {
  open: boolean;
  clip: Clip | null;
  courseName?: string;
  onClose: () => void;
  /** Hàng nút (Tải về / Publish / Gỡ / Xoá) — trang truyền vào để chỉ có MỘT chỗ định nghĩa. */
  actions?: React.ReactNode;
}

/**
 * Chi tiết một clip. Trên điện thoại đây là nơi xem đủ thông tin: bảng chỉ giữ được 2–3 cột,
 * phần còn lại (mốc gốc, dung lượng, lỗi khi cắt hỏng, trạng thái đăng Tin) nằm ở đây.
 */
export function ClipDetailDrawer({
  open,
  clip,
  courseName,
  onClose,
  actions,
}: ClipDetailDrawerProps) {
  const isMobile = useIsMobile();

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={clip?.title || "Clip"}
      width={isMobile ? "100%" : 520}
      placement={isMobile ? "bottom" : "right"}
      height={isMobile ? "85%" : undefined}
      footer={actions}
    >
      {clip && (
        <>
          {clip.clipUrl && (
            // Video ngang 16:9 — video bài giảng của FTES vốn là khung ngang, không phải dọc.
            <video
              src={clip.clipUrl}
              poster={clip.posterUrl ?? undefined}
              controls
              preload="metadata"
              style={{ width: "100%", aspectRatio: "16 / 9", background: "#000", borderRadius: 8 }}
            />
          )}

          <Descriptions column={1} size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label="Trạng thái">
              <Tag color={clipStatusColor(clip.status)}>{CLIP_STATUS_LABEL[clip.status]}</Tag>
              {clip.publishedStoryId && <Tag color="purple">Đang trên mục Tin</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Khoá học">{courseName ?? clip.courseId ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Bài học">{clip.lessonId ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Mốc cắt">
              {formatMmSs(clip.startMs)} → {formatMmSs(clip.endMs)}
            </Descriptions.Item>
            <Descriptions.Item label="Độ dài">
              {formatDurationSeconds(clip.durationSeconds)}
            </Descriptions.Item>
            <Descriptions.Item label="Dung lượng">{formatBytes(clip.sizeBytes)}</Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">{formatDateTime(clip.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="Đăng Tin lúc">
              {formatDateTime(clip.publishedAt)}
            </Descriptions.Item>
          </Descriptions>

          {clip.description && (
            <Typography.Paragraph type="secondary">{clip.description}</Typography.Paragraph>
          )}

          {clip.error && (
            <Typography.Paragraph type="danger" style={{ marginBottom: 0 }}>
              {clip.error}
            </Typography.Paragraph>
          )}
        </>
      )}
    </Drawer>
  );
}
