import { Card, Skeleton, Typography, Button, Empty, Row, Col, Statistic, Tag } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useModerationStats } from "../api/analytics.api";

export function ModerationWidget() {
  const { data, isLoading, isError, error, refetch } = useModerationStats();

  if (isLoading) {
    return (
      <Card title="Moderation queue">
        <Skeleton active paragraph={{ rows: 3 }} title={{ width: "50%" }} />
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card title="Moderation queue">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={error?.message ?? "Lỗi tải dữ liệu"}>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Thử lại
          </Button>
        </Empty>
      </Card>
    );
  }

  const pendingTotal = Object.values(data.pendingByType).reduce((a, b) => a + b, 0);

  return (
    <Card title="Moderation queue">
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Statistic title="Chờ xử lý" value={pendingTotal} />
        </Col>
        <Col span={12}>
          <Statistic title="Đã xử lý 7 ngày" value={data.resolved7d} />
        </Col>
        <Col span={12}>
          <Statistic title="Thời gian TB (giờ)" value={data.avgResolutionHours} precision={1} />
        </Col>
      </Row>
      <div style={{ marginTop: 12 }}>
        <Typography.Text type="secondary">Theo loại:</Typography.Text>
        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(data.pendingByType).map(([type, count]) => (
            <Tag key={type} color={count > 0 ? "warning" : "default"}>
              {type}: {count}
            </Tag>
          ))}
        </div>
      </div>
    </Card>
  );
}
