import { useMemo } from "react";
import {
  Alert,
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
      // Chi phí được tính theo đơn giá của CHÍNH model này. Không hiện model thì con số chi phí
      // không kiểm chứng được, và người xem không biết đắt là do dùng nhiều hay do model đắt.
      title: "Model",
      dataIndex: "modelName",
      render: (model: string | null | undefined) =>
        model ? (
          <Typography.Text code style={{ fontSize: 12 }}>{model}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">chưa cấu hình</Typography.Text>
        ),
    },
    {
      title: "Đơn giá (USD/1k)",
      align: "right" as const,
      render: (_: unknown, row: AiInsightRow) =>
        row.priceKnown ? (
          <Typography.Text style={{ fontSize: 12 }}>
            vào {row.promptPer1k} / ra {row.completionPer1k}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary">chưa rõ</Typography.Text>
        ),
    },
    {
      title: "Chi phí ước tính",
      dataIndex: "estimatedCostUsd",
      align: "right" as const,
      sorter: (a: AiInsightRow, b: AiInsightRow) => a.estimatedCostUsd - b.estimatedCostUsd,
      // priceKnown=false → chi phí 0 vì KHÔNG BIẾT giá, không phải vì miễn phí. Hiện "—" thay vì
      // "$0.00": một số 0 trông như số thật là thứ khiến người ta quyết định sai mà không biết.
      render: (v: number, row: AiInsightRow) =>
        row.priceKnown ? formatCurrency(v) : <Typography.Text type="secondary">—</Typography.Text>,
    },
  ];

  // Tổng thiếu giá của ít nhất một feature → nói rõ ngay trên thẻ, đừng để con số trông đầy đủ.
  const pricesComplete = data?.pricesComplete !== false;
  const summaryCards = [
    { label: "Tổng requests", value: formatNumber(totals.requests) },
    { label: "Input tokens", value: formatNumber(totals.inputTokens) },
    { label: "Output tokens", value: formatNumber(totals.outputTokens) },
    {
      label: pricesComplete ? "Chi phí ước tính" : "Chi phí (THIẾU)",
      value: formatCurrency(totals.cost),
    },
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

      {!pricesComplete && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Tổng chi phí đang THIẾU"
          description="Có tính năng tiêu token nhưng chưa tra được đơn giá model (ai-service không phản hồi, hoặc model không còn trong catalog). Những dòng đó hiện '—' thay vì $0.00 — con số tổng vì vậy nhỏ hơn thực tế."
        />
      )}

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
