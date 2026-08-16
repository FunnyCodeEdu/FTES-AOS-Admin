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
    return <Empty description="Album chưa có trang nào — không có gì để xem trước." />;
  }

  return (
    <Space direction="vertical" size="small" style={{ width: "100%" }}>
      <Tag color="purple">
        {data?.total ?? images.length}/{data?.maxImages ?? "—"} trang
      </Tag>
      <Image.PreviewGroup>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: 12,
          }}
        >
          {images.map((image, index) =>
            image.kind === "TEXT" ? (
              // Trang SỐ HOÁ: không có ảnh để chiếu. Trước đây mọi mục đều đi qua <Image>, nên
              // trang loại này hiện ra một ô vỡ — không phải lỗi, chỉ là một ô trống khó hiểu với
              // người đang duyệt nội dung. Ở đây cần đọc được CHỮ để duyệt, nên chiếu thẳng trích
              // đoạn thay vì một biểu tượng "đây là văn bản".
              <div
                key={image.id}
                style={{
                  height: 120,
                  padding: 8,
                  borderRadius: 6,
                  border: "1px solid #f0f0f0",
                  background: "#fafafa",
                  overflow: "hidden",
                }}
              >
                <Tag color="blue" style={{ marginBottom: 4 }}>
                  Trang chữ
                </Tag>
                <Typography.Paragraph
                  type="secondary"
                  style={{ fontSize: 11, marginBottom: 0, whiteSpace: "pre-wrap" }}
                  ellipsis={{ rows: 4, tooltip: image.textContent ?? undefined }}
                >
                  {image.textContent?.trim() || "(trang chữ rỗng)"}
                </Typography.Paragraph>
              </div>
            ) : (
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
            )
          )}
        </div>
      </Image.PreviewGroup>
    </Space>
  );
}
