import { useMemo } from "react";
import {
  Card,
  Col,
  Empty,
  List,
  Row,
  Skeleton,
  Statistic,
  Typography,
  Button,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useMe } from "../auth/api";
import { hasAnyPermission } from "../../shared/permissions";
import { useWidgetData, type WidgetDefinition } from "./api";

interface ChartDatum {
  label: string;
  value: number;
  color?: string;
}

function isChartData(data: unknown): data is ChartDatum[] {
  return (
    Array.isArray(data) &&
    data.every((d) => typeof d === "object" && d !== null && "label" in d && "value" in d)
  );
}

function StatWidget({ title, data }: { title: string; data: unknown }) {
  const value = typeof data === "number" ? data : Array.isArray(data) ? data.length : 0;
  return (
    <Card>
      <Statistic title={title} value={value} />
    </Card>
  );
}

function ChartWidget({ title, data }: { title: string; data: unknown }) {
  if (!isChartData(data)) {
    return (
      <Card title={title}>
        <Typography.Text type="secondary">Dữ liệu biểu đồ không hợp lệ</Typography.Text>
      </Card>
    );
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <Card title={title}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.map((item) => (
          <div key={item.label}>
            <Typography.Text style={{ fontSize: 12 }}>{item.label}</Typography.Text>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  height: 12,
                  borderRadius: 6,
                  background: item.color ?? "#3F51B5",
                  width: `${(item.value / max) * 100}%`,
                  minWidth: 4,
                }}
              />
              <Typography.Text strong style={{ fontSize: 12 }}>
                {item.value}
              </Typography.Text>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ListWidget({ title, data }: { title: string; data: unknown }) {
  const items = Array.isArray(data) ? data : [];
  return (
    <Card title={title}>
      <List
        size="small"
        dataSource={items.slice(0, 5)}
        locale={{ emptyText: "Không có dữ liệu" }}
        renderItem={(item: unknown, idx) => (
          <List.Item key={idx}>
            <Typography.Text ellipsis style={{ maxWidth: "100%" }}>
              {typeof item === "string" ? item : JSON.stringify(item)}
            </Typography.Text>
          </List.Item>
        )}
      />
    </Card>
  );
}

function WidgetCard({ widget }: { widget: WidgetDefinition }) {
  const { data, isLoading, isError, error, refetch } = useWidgetData<unknown>(
    widget.key,
    widget.dataEndpoint,
    true
  );

  let content: React.ReactNode;
  if (isLoading) {
    content = <Skeleton active paragraph={{ rows: 3 }} />;
  } else if (isError) {
    content = (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={error?.message ?? "Lỗi tải dữ liệu"}
      >
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
          Thử lại
        </Button>
      </Empty>
    );
  } else {
    switch (widget.type) {
      case "stat":
        content = <StatWidget title={widget.title} data={data} />;
        break;
      case "chart":
        content = <ChartWidget title={widget.title} data={data} />;
        break;
      case "list":
        content = <ListWidget title={widget.title} data={data} />;
        break;
      default:
        content = (
          <Card title={widget.title}>
            <Typography.Text type="secondary">Loại widget không xác định</Typography.Text>
          </Card>
        );
    }
  }

  return <div>{content}</div>;
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

interface WidgetGridProps {
  widgets: WidgetDefinition[];
}

export function WidgetGrid({ widgets }: WidgetGridProps) {
  if (widgets.length === 0) {
    return (
      <Empty
        description="Bạn chưa được cấp quyền xem thống kê"
        style={{ marginTop: 48 }}
      />
    );
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

export function usePermittedWidgets(widgets: WidgetDefinition[]) {
  const { data: me } = useMe();
  const permissions = me?.permissions ?? [];
  const permSet = useMemo(() => new Set(permissions), [permissions]);
  return useMemo(
    () => widgets.filter((w) => hasAnyPermission(permSet, w.requiredPermissions)),
    [widgets, permSet]
  );
}
