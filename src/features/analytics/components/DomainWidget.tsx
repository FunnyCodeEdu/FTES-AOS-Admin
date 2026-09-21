import { Card, Skeleton, Typography, Button, Empty, Statistic, Col, Row } from "antd";
import { ReloadOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { useAnalyticsDomain } from "../api/analytics.api";
import type { AnalyticsDomain, DateRange } from "../shared/types";

interface DomainWidgetProps {
  domain: AnalyticsDomain;
  label: string;
  range: DateRange;
}

const DOMAIN_COLORS: Record<AnalyticsDomain, string> = {
  learning: "#1677ff",
  subject: "#722ed1",
  community: "#fa8c16",
  ai: "#eb2f96",
  gamification: "#13c2c2",
  business: "#52c41a",
};

function MiniChart({ series, color }: { series: number[]; color: string }) {
  const width = 120;
  const height = 40;
  const max = Math.max(1, ...series);
  const points = series
    .map((value, i) => {
      const x = (i / Math.max(1, series.length - 1)) * width;
      const y = height - (value / max) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}

export function DomainWidget({ domain, label, range }: DomainWidgetProps) {
  const { data, isLoading, isError, error, refetch } = useAnalyticsDomain(domain, range);
  const color =
    DOMAIN_COLORS[domain] ??
    DOMAIN_COLORS[(domain ?? "").toString().toLowerCase() as AnalyticsDomain] ??
    "#1677ff";

  if (isLoading) {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 2 }} title={{ width: "60%" }} />
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card title={label}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={error?.message ?? "Lỗi tải dữ liệu"}>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Thử lại
          </Button>
        </Empty>
      </Card>
    );
  }

  const primaryKpi = data.kpis[0] ?? { label: "Tổng", value: 0, delta: 0, series: [] };
  const secondaryKpis = data.kpis.slice(1, 4);

  const formatValue = (key: string | undefined, value: number) => {
    if (key === "total_revenue" || key === "average_order_value") {
      return `${Math.round(value).toLocaleString("vi-VN")} đ`;
    }
    if (key === "ai_cost_usd") return `$${value.toLocaleString("vi-VN", { maximumFractionDigits: 4 })}`;
    if (key === "study_seconds") return `${(value / 3600).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} giờ`;
    return value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
  };

  return (
    <Card
      title={label}
      extra={
        <Link to={`/analytics/${domain}?from=${range.from}&to=${range.to}`}>
          <Button type="link" size="small" icon={<ArrowRightOutlined />}>
            Chi tiết
          </Button>
        </Link>
      }
    >
      <Statistic
        title={primaryKpi.label}
        value={formatValue(primaryKpi.key, primaryKpi.value)}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
        {primaryKpi.series.length > 0 ? (
          <Typography.Text type={primaryKpi.delta >= 0 ? "success" : "danger"}>
            {`${primaryKpi.delta >= 0 ? "+" : ""}${primaryKpi.delta.toFixed(1)}%`}
          </Typography.Text>
        ) : <span />}
        {primaryKpi.series.length > 0 && <MiniChart series={primaryKpi.series} color={color} />}
      </div>
      {secondaryKpis.length > 0 && (
        <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
          {secondaryKpis.map((kpi) => (
            <Col span={8} key={kpi.key ?? kpi.label}>
              <Typography.Text type="secondary" style={{ fontSize: 12, display: "block" }} ellipsis>
                {kpi.label}
              </Typography.Text>
              <Typography.Text strong style={{ fontSize: 14 }}>
                {formatValue(kpi.key, kpi.value)}
              </Typography.Text>
            </Col>
          ))}
        </Row>
      )}
    </Card>
  );
}
