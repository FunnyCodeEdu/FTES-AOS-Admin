import { useMemo } from "react";
import {
  Button,
  Card,
  Col,
  Empty,
  Row,
  Space,
  Table,
  Typography,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useAiInsights } from "../api";
import type { AiInsightRow } from "../types";

function formatNumber(value: number): string {
  return value.toLocaleString("vi-VN");
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value: number): string {
  // errorRate có thể là tỉ lệ 0..1 hoặc phần trăm 0..100 tuỳ BE — chuẩn hoá về %.
  const pct = value <= 1 ? value * 100 : value;
  return `${pct.toFixed(1)}%`;
}

export default function AiInsightsPage() {
  const { data, isLoading, isError, error, refetch } = useAiInsights();

  const rows = data?.rows ?? [];

  // Tổng requests/tokens gộp từ rows; totalTokens & cost lấy trực tiếp từ BE (authoritative).
  const totals = useMemo(() => {
    const requests = rows.reduce((acc, row) => acc + row.requests, 0);
    const inputTokens = rows.reduce((acc, row) => acc + row.inputTokens, 0);
    const outputTokens = rows.reduce((acc, row) => acc + row.outputTokens, 0);
    return {
      requests,
      inputTokens,
      outputTokens,
      cost: data?.estimatedCostUsd ?? 0,
    };
  }, [rows, data]);

  const columns = [
    {
      title: "Tính năng",
      dataIndex: "feature",
      render: (feature: string) => <Typography.Text strong>{feature}</Typography.Text>,
    },
    {
      title: "Requests",
      dataIndex: "requests",
      align: "right" as const,
      sorter: (a: AiInsightRow, b: AiInsightRow) => a.requests - b.requests,
      render: (v: number) => formatNumber(v),
    },
    {
      title: "Input tokens",
      dataIndex: "inputTokens",
      align: "right" as const,
      render: (v: number) => formatNumber(v),
    },
    {
      title: "Output tokens",
      dataIndex: "outputTokens",
      align: "right" as const,
      render: (v: number) => formatNumber(v),
    },
    {
      title: "Tỉ lệ lỗi",
      dataIndex: "errorRate",
      align: "right" as const,
      render: (v: number) => formatPercent(v),
    },
    {
      title: "Chi phí ước tính",
      dataIndex: "estimatedCostUsd",
      align: "right" as const,
      sorter: (a: AiInsightRow, b: AiInsightRow) => a.estimatedCostUsd - b.estimatedCostUsd,
      render: (v: number) => formatCurrency(v),
    },
  ];

  const summaryCards = [
    { label: "Tổng requests", value: formatNumber(totals.requests) },
    { label: "Input tokens", value: formatNumber(totals.inputTokens) },
    { label: "Output tokens", value: formatNumber(totals.outputTokens) },
    { label: "Chi phí ước tính", value: formatCurrency(totals.cost) },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16, justifyContent: "space-between", width: "100%" }} align="center">
        <Typography.Title level={3} style={{ margin: 0 }}>
          AI Insights
        </Typography.Title>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
          Tải lại
        </Button>
      </Space>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {summaryCards.map((c) => (
          <Col xs={24} sm={12} lg={6} key={c.label}>
            <Card loading={isLoading}>
              <Typography.Text type="secondary">{c.label}</Typography.Text>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {c.value}
              </Typography.Title>
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="Sử dụng theo tính năng">
        {isError ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={error?.message ?? "Lỗi tải dữ liệu"}
          >
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              Thử lại
            </Button>
          </Empty>
        ) : (
          <Table
            rowKey="feature"
            columns={columns}
            dataSource={rows}
            loading={isLoading}
            pagination={false}
          />
        )}
      </Card>
    </div>
  );
}
