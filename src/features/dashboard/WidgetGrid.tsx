import { Card, Col, Empty, List, Row, Skeleton, Statistic, Typography } from "antd";
import { sumPrimaryNumeric, type DashboardWidget } from "./api";

function StatCard({ title, value }: { title: string; value: number | null }) {
  return (
    <Card>
      <Statistic title={title} value={value ?? 0} />
    </Card>
  );
}

function ChartCard({ widget }: { widget: DashboardWidget }) {
  // Dashboard tổng quan không nhúng chart nặng: hiển thị tổng cột số chính + số mốc dữ liệu.
  const total = sumPrimaryNumeric(widget.series);
  return (
    <Card>
      <Statistic
        title={widget.title}
        value={total}
        suffix={
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {` · ${widget.series.length} mốc`}
          </Typography.Text>
        }
      />
    </Card>
  );
}

function ListCard({ widget }: { widget: DashboardWidget }) {
  return (
    <Card title={widget.title} size="small">
      <List
        size="small"
        dataSource={widget.table.slice(0, 5)}
        locale={{ emptyText: "Không có dữ liệu" }}
        renderItem={(row: Record<string, unknown>, idx) => {
          const label = Object.values(row)
            .map((v) => (v === null || v === undefined ? "" : String(v)))
            .filter(Boolean)
            .slice(0, 3)
            .join(" · ");
          return (
            <List.Item key={idx}>
              <Typography.Text ellipsis style={{ maxWidth: "100%" }}>
                {label || JSON.stringify(row)}
              </Typography.Text>
            </List.Item>
          );
        }}
      />
    </Card>
  );
}

function WidgetCard({ widget }: { widget: DashboardWidget }) {
  switch (widget.kind) {
    case "stat":
      return <StatCard title={widget.title} value={widget.value} />;
    case "chart":
      return <ChartCard widget={widget} />;
    case "list":
      return <ListCard widget={widget} />;
    default:
      return (
        <Card title={widget.title}>
          <Typography.Text type="secondary">Loại widget không xác định</Typography.Text>
        </Card>
      );
  }
}

export function WidgetGridSkeleton() {
  return (
    <Row gutter={[16, 16]}>
      {[1, 2, 3, 4].map((i) => (
        <Col xs={24} sm={12} lg={8} xl={6} key={i}>
          <Card>
            <Skeleton active paragraph={{ rows: 3 }} />
          </Card>
        </Col>
      ))}
    </Row>
  );
}

export function WidgetGrid({ widgets }: { widgets: DashboardWidget[] }) {
  if (widgets.length === 0) {
    return <Empty description="Chưa có dữ liệu thống kê" style={{ marginTop: 48 }} />;
  }
  return (
    <Row gutter={[16, 16]}>
      {widgets.map((widget) => (
        <Col xs={24} sm={12} lg={8} xl={6} key={widget.key}>
          <WidgetCard widget={widget} />
        </Col>
      ))}
    </Row>
  );
}
