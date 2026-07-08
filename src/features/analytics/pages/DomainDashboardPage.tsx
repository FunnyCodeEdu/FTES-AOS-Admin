import { useEffect, useMemo, useState } from "react";
import { Navigate, useMatch, useParams } from "react-router-dom";
import { Card, Col, Empty, Row, Skeleton, Table, Typography, Button, Space } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useMe } from "../../../features/auth/api";
import { NotFoundPage } from "../../../shared/permissions";
import { useAnalyticsBreakdown, useAnalyticsDomain } from "../api/analytics.api";
import { ChartRenderer, ChartSkeleton } from "../components/ChartRenderer";
import { CsvExportButton } from "../components/CsvExportButton";
import { DateRangePicker, useAnalyticsDateRange } from "../components/DateRangePicker";
import { isAnalyticsDomain, type AnalyticsDomain } from "../shared/types";

function useDomainParam(): AnalyticsDomain | null {
  const params = useParams<{ domain?: string }>();
  const match = useMatch("/analytics/:domain");
  const raw = params.domain ?? match?.params.domain;
  if (raw && isAnalyticsDomain(raw)) return raw;
  return null;
}

export default function DomainDashboardPage() {
  const domain = useDomainParam();
  const { data: me } = useMe();
  const { range } = useAnalyticsDateRange();

  // Validate permission for the requested domain. Backend catalog gates admin analytics reads
  // với 1 leaf chung `admin.analytics.read` (không có leaf per-domain `analytics.view.<domain>`).
  const requiredPermission = domain ? "admin.analytics.read" : null;
  const hasPermission = requiredPermission ? (me?.permissions ?? []).includes(requiredPermission) : false;

  useEffect(() => {
    // nothing to do; PermissionRoute already gates concrete routes, but this page
    // also handles the parameterized route directly.
  }, [domain]);

  if (!domain || !requiredPermission) {
    return <NotFoundPage />;
  }

  if (!hasPermission) {
    return (
      <Navigate
        to="/403"
        replace
        state={{ missingPermissions: [requiredPermission], from: `/analytics/${domain}` }}
      />
    );
  }

  return <DomainDashboardBody domain={domain} range={range} />;
}

function DomainDashboardBody({ domain, range }: { domain: AnalyticsDomain; range: { from: string; to: string } }) {
  const { data, isLoading, isError, error, refetch } = useAnalyticsDomain(domain, range);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });

  const {
    data: breakdown,
    isLoading: breakdownLoading,
    isError: breakdownError,
    error: breakdownErrorObj,
    refetch: refetchBreakdown,
  } = useAnalyticsBreakdown(domain, range, pagination.page, pagination.pageSize);

  const columns = useMemo(() => {
    if (!breakdown?.items.length) return [];
    return Object.keys(breakdown.items[0]).map((key) => ({
      title: key,
      dataIndex: key,
      key,
      sorter: true,
    }));
  }, [breakdown]);

  return (
    <div>
      <Space style={{ marginBottom: 16, justifyContent: "space-between", width: "100%" }} align="center">
        <Typography.Title level={3} style={{ margin: 0 }}>
          Dashboard {domain}
        </Typography.Title>
        <Space>
          <DateRangePicker />
          <CsvExportButton domain={domain} range={range} />
        </Space>
      </Space>

      {isLoading ? (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {[1, 2].map((i) => (
            <Col xs={24} sm={12} key={i}>
              <Card>
                <Skeleton active paragraph={{ rows: 1 }} title={{ width: "60%" }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : isError || !data ? (
        <Card style={{ marginBottom: 24 }}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={error?.message ?? "Lỗi tải dữ liệu"}>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              Thử lại
            </Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {data.kpis.map((kpi, idx) => (
            <Col xs={24} sm={12} lg={6} key={idx}>
              <Card>
                <Typography.Text type="secondary">{kpi.label}</Typography.Text>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {kpi.value.toLocaleString("vi-VN")}
                </Typography.Title>
                <Typography.Text type={kpi.delta >= 0 ? "success" : "danger"}>
                  {`${kpi.delta >= 0 ? "+" : ""}${kpi.delta.toFixed(1)}%`}
                </Typography.Text>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {isLoading
          ? [1, 2].map((i) => (
              <Col xs={24} lg={12} key={i}>
                <ChartSkeleton />
              </Col>
            ))
          : data?.charts.map((chart) => (
              <Col xs={24} lg={12} key={chart.key}>
                <ChartRenderer chart={chart} />
              </Col>
            ))}
      </Row>

      <Card title="Breakdown">
        {breakdownLoading ? (
          <Skeleton active paragraph={{ rows: 5 }} />
        ) : breakdownError ? (
          <Empty description={breakdownErrorObj?.message ?? "Lỗi tải breakdown"}>
            <Button icon={<ReloadOutlined />} onClick={() => refetchBreakdown()}>
              Thử lại
            </Button>
          </Empty>
        ) : (
          <Table
            rowKey={(row) => String(row.id ?? Math.random())}
            columns={columns}
            dataSource={breakdown?.items ?? []}
            pagination={{
              current: pagination.page,
              pageSize: pagination.pageSize,
              total: breakdown?.total ?? 0,
              showSizeChanger: true,
            }}
            onChange={(p) => setPagination({ page: p.current ?? 1, pageSize: p.pageSize ?? 10 })}
          />
        )}
      </Card>
    </div>
  );
}
