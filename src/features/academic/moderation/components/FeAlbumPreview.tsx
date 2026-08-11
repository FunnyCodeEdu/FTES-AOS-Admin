import { Alert, Button, Empty, Image, Skeleton, Space, Tag, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useFeAlbum } from "../api/moderation.api";

interface FeAlbumPreviewProps {
  resourceId: string;
}

/**
 * Preview album ảnh đề FE (`GET /api/v1/resources/{id}/images`).
 *
 * Khối này CỐ Ý tự xử lý loading/lỗi/rỗng của riêng nó thay vì đẩy lên drawer cha: người duyệt vẫn
 * phải bấm được Duyệt/Từ chối kể cả khi album không tải nổi (ảnh hỏng link, Cloudinary chập). Lỗi
 * ở đây là `warning` chứ không phải `error` — không xem được ảnh là bất tiện, không phải hỏng việc.
 */
export function FeAlbumPreview({ resourceId }: FeAlbumPreviewProps) {
  const { data, isLoading, isError, error, refetch, isFetching } = useFeAlbum(resourceId);

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 4 }} />;
  }

  if (isError) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Không tải được album ảnh đề FE"
        description={
          <Space direction="vertical" size={4}>
            <span>{error?.message}</span>
            <span>Bạn vẫn có thể duyệt hoặc từ chối mục này.</span>
          </Space>
        }
        action={
          <Button size="small" icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()}>
            Thử lại
          </Button>
        }
      />
    );
  }

  const images = [...(data?.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  if (images.length === 0) {
    return <Empty description="Album chưa có ảnh nào — không có gì để xem trước." />;
  }

  return (
    <Space direction="vertical" size="small" style={{ width: "100%" }}>
      <Tag color="purple">
        {data?.total ?? images.length}/{data?.maxImages ?? "—"} ảnh
      </Tag>
      <Image.PreviewGroup>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: 12,
          }}
        >
          {images.map((image, index) => (
            <div key={image.id}>
              <Image
                src={image.imageUrl}
                alt={image.caption ?? `Ảnh đề ${index + 1}`}
                style={{
                  width: "100%",
                  height: 120,
                  objectFit: "cover",
                  borderRadius: 6,
                  border: "1px solid #f0f0f0",
                }}
              />
              <Typography.Text
                type="secondary"
                ellipsis={{ tooltip: image.caption ?? undefined }}
                style={{ fontSize: 12, display: "block", marginTop: 4 }}
              >
                {index + 1}. {image.caption || "(không chú thích)"}
              </Typography.Text>
            </div>
          ))}
        </div>
      </Image.PreviewGroup>
    </Space>
  );
}
