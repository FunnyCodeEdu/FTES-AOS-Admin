import { Alert, List, Skeleton, Space, Typography } from "antd";
import type { BroadcastPreview as BroadcastPreviewType } from "../shared/types";

interface BroadcastPreviewProps {
  data?: BroadcastPreviewType;
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
}

export function BroadcastPreview({ data, isLoading, isError, error }: BroadcastPreviewProps) {
  if (isLoading) return <Skeleton active paragraph={{ rows: 3 }} />;
  if (isError) return <Alert type="error" message="Không thể tải preview" description={error?.message} />;
  if (!data) return null;

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Typography.Text strong>
        Số đối tượng nhận:{" "}
        <Typography.Text type={data.recipientCount === 0 ? "danger" : undefined}>
          {data.recipientCount.toLocaleString()}
        </Typography.Text>
      </Typography.Text>
      {data.recipientCount === 0 && (
        <Alert type="warning" message="Segment không khớp user nào. Vui lòng mở rộng điều kiện." />
      )}
      {data.sample.length > 0 && (
        <>
          <Typography.Text type="secondary">Mẫu 5 đối tượng đầu tiên:</Typography.Text>
          <List
            size="small"
            bordered
            dataSource={data.sample}
            renderItem={(item) => (
              <List.Item>
                {item.fullName} ({item.email})
              </List.Item>
            )}
          />
        </>
      )}
    </Space>
  );
}
