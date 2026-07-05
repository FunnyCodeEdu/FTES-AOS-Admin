import { Card, Col, Row, Skeleton, Statistic, Typography, Button, Empty } from "antd";
import { ArrowDownOutlined, ArrowUpOutlined, ReloadOutlined } from "@ant-design/icons";
import { useAnalyticsOverview } from "../api/analytics.api";
import type { DateRange } from "../shared/types";

interface OverviewWidgetProps {
  range: DateRange;
}

function Sparkline({ series, color }: { series: number[]; color: string }) {
  const width = 120;
  const height = 32;
  const max = Math.max(1, ...series);
  const min = Math.min(0, ...series);
  const range = max - min || 1;

  const points = series
    .map((value, i) => {
      const x = (i / Math.max(1, series.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}

function KpiSkeleton() {
  return (
    <Card>
      <Skeleton active paragraph={{ rows: 1 }} title={{ width: "60%" }} />
      <Skeleton.Node active style={{ width: 120, height: 32 }}>
        <div />
      </Skeleton.Node>
    </Card>
  );
}

export function OverviewWidget({ range }: OverviewWidgetProps) {
  const { data, isLoading, isError, error, refetch } = useAnalyticsOverview(range);

  if (isLoading) {
    return (
      <Row gutter={[16, 16]}>
        {[1, 2, 3, 4].map((i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <KpiSkeleton />
          </Col>
        ))}
      </Row>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={error?.message ?? "Lỗi tải dữ liệu"}>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Thử lại
          </Button>
        </Empty>
      </Card>
    );
  }

  const items = [
    { key: "users", title: "Người dùng", data: data.users, color: "#1677ff" },
    { key: "revenue", title: "Doanh thu", data: data.revenue, color: "#52c41a" },
    { key: "engagement", title: "Tương tác", data: data.engagement, color: "#faad14" },
    { key: "aiCost", title: "Chi phí AI", data: data.aiCost, color: "#f5222d" },
  ];

  return (
    <Row gutter={[16, 16]}>
      {items.map((item) => {
        const positive = item.data.delta >= 0;
        return (
          <Col xs={24} sm={12} lg={6} key={item.key}>
            <Card>
              <Statistic
                title={item.title}
                value={item.data.value}
                precision={item.key === "revenue" || item.key === "aiCost" ? 0 : 0}
                valueStyle={{ fontSize: 24 }}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                <Typography.Text type={positive ? "success" : "danger"}>
                  {positive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  {` ${Math.abs(item.data.delta).toFixed(1)}%`}
                </Typography.Text>
                <Sparkline series={item.data.series} color={item.color} />
              </div>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
}
