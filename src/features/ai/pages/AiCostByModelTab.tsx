import { Alert, Card, Col, Empty, Row, Table, Tag, Typography } from "antd";
import { useAiInsightsByModel } from "../api";
import type { AiModelInsightRow } from "../types";

/**
 * Chi phí gộp theo MODEL — tab thứ hai của AI Insights.
 *
 * Khác tab theo tính năng ở chỗ nó trả lời đúng câu hỏi đang phải quyết: **model nào đốt bao nhiêu**,
 * để biết model nào đáng khoá sau mốc chi tiêu hoặc nên đổi. Một model phục vụ 24 tính năng thì bảng
 * theo tính năng buộc người xem cộng tay 24 dòng.
 *
 * Số liệu đến từ `ai.model_usage_daily` — ghi model THỰC DÙNG mỗi lượt, nên fallback đẩy sang model
 * khác thì bảng phản ánh đúng model đã chạy, không phải model cấu hình.
 */
function formatNumber(v: number): string {
  return v.toLocaleString("en-US");
}

/** Cùng luật với tab theo tính năng: chi phí ở đây là phần nghìn đô, làm tròn 2 số là mất sạch. */
function formatCurrency(v: number): string {
  if (v === 0) {
    return "$0";
  }
  const digits = Math.abs(v) >= 1 ? 2 : 4;
  return `$${v.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export default function AiCostByModelTab() {
  const { data, isLoading, isError, error } = useAiInsightsByModel();
  const rows = data?.rows ?? [];
  const pricesComplete = data?.pricesComplete !== false;

  const columns = [
    {
      title: "Model",
      dataIndex: "modelName",
      render: (m: string) => <Typography.Text code>{m}</Typography.Text>,
    },
    {
      title: "Lượt gọi",
      dataIndex: "calls",
      align: "right" as const,
      sorter: (a: AiModelInsightRow, b: AiModelInsightRow) => a.calls - b.calls,
      render: (v: number) => formatNumber(v),
    },
    {
      title: "Token vào",
      dataIndex: "tokenInput",
      align: "right" as const,
      render: (v: number) => formatNumber(v),
    },
    {
      title: "Token ra",
      dataIndex: "tokenOutput",
      align: "right" as const,
      sorter: (a: AiModelInsightRow, b: AiModelInsightRow) => a.tokenOutput - b.tokenOutput,
      render: (v: number) => formatNumber(v),
    },
    {
      title: "Đơn giá (USD/1k)",
      align: "right" as const,
      render: (_: unknown, r: AiModelInsightRow) =>
        r.priceKnown ? (
          <Typography.Text style={{ fontSize: 12 }}>
            vào {r.promptPer1k} / ra {r.completionPer1k}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary">chưa rõ</Typography.Text>
        ),
    },
    {
      // Thủ phạm: model đắt mà chỉ một tính năng dùng thì đổi tính năng đó là xong; nhiều tính năng
      // dùng thì phải cân nhắc rộng hơn. Không có cột này thì con số tổng không hành động được.
      title: "Tính năng dùng",
      dataIndex: "features",
      render: (fs: string[]) =>
        fs.length === 0 ? (
          <Typography.Text type="secondary">—</Typography.Text>
        ) : (
          <span>
            {fs.map((f) => (
              <Tag key={f} style={{ marginBottom: 2 }}>{f}</Tag>
            ))}
          </span>
        ),
    },
    {
      title: "Đã đốt",
      dataIndex: "estimatedCostUsd",
      align: "right" as const,
      defaultSortOrder: "descend" as const,
      sorter: (a: AiModelInsightRow, b: AiModelInsightRow) =>
        a.estimatedCostUsd - b.estimatedCostUsd,
      // priceKnown=false → 0 vì KHÔNG BIẾT giá, không phải vì miễn phí.
      render: (v: number, r: AiModelInsightRow) =>
        r.priceKnown ? (
          <Typography.Text strong>{formatCurrency(v)}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
  ];

  if (isError) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={error?.message ?? "Lỗi tải chi phí theo model"}
      />
    );
  }

  return (
    <div>
      {/* Nói thẳng giới hạn: bảng đếm TỪ ngày bật ghi model, không có lịch sử. Giấu điều này đi thì
          người xem sẽ tưởng model mới bật là model rẻ nhất hệ thống. */}
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Bảng đếm từ ngày bật ghi model"
        description={
          data?.sinceDate
            ? `Dữ liệu tính từ ${data.sinceDate}. Lượt gọi TRƯỚC khi bật tính năng này không có trong bảng — vì bảng token cũ không lưu model, suy ngược theo cấu hình hiện tại sẽ gán nhầm token của model rẻ sang model đắt.`
            : "Lượt gọi trước khi bật tính năng này không có trong bảng."
        }
      />

      {!pricesComplete && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Tổng chi phí đang THIẾU"
          description="Có model chưa tra được đơn giá (ai-service không phản hồi, hoặc model không còn trong catalog). Những dòng đó hiện '—' thay vì $0.00."
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card loading={isLoading}>
            <Typography.Text type="secondary">Số model đã dùng</Typography.Text>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {rows.length}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card loading={isLoading}>
            <Typography.Text type="secondary">Tổng token</Typography.Text>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {formatNumber(data?.totalTokens ?? 0)}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card loading={isLoading}>
            <Typography.Text type="secondary">
              {pricesComplete ? "Tổng đã đốt" : "Tổng đã đốt (THIẾU)"}
            </Typography.Text>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {formatCurrency(data?.estimatedCostUsd ?? 0)}
            </Typography.Title>
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          rowKey="modelName"
          columns={columns}
          dataSource={rows}
          loading={isLoading}
          pagination={false}
          locale={{
            emptyText: "Chưa có lượt gọi nào được ghi model kể từ khi bật.",
          }}
        />
      </Card>
    </div>
  );
}
