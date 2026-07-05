import { useState } from "react";
import { Card, Descriptions, Empty, Select, Space, Typography } from "antd";
import { useCtvKpi } from "../api/ctvMe.api";

const RANGE_OPTIONS = [
  { label: "7 ngày", value: "7d" },
  { label: "30 ngày", value: "30d" },
  { label: "90 ngày", value: "90d" },
];

export default function CtvKpiPage() {
  const [range, setRange] = useState("30d");
  const { data, isLoading, isError } = useCtvKpi(range);

  return (
    <div>
      <Typography.Title level={3}>KPI của bạn</Typography.Title>
      <Space style={{ marginBottom: 16 }}>
        <Select value={range} options={RANGE_OPTIONS} onChange={setRange} style={{ width: 160 }} />
      </Space>
      {isLoading ? <Card loading /> : isError ? <Typography.Text type="danger">Không thể tải KPI</Typography.Text> : (
        <>
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Resources đã xử lý">{data?.resourcesProcessed ?? 0}</Descriptions.Item>
            <Descriptions.Item label="Posts đã kiểm duyệt">{data?.postsModerated ?? 0}</Descriptions.Item>
          </Descriptions>
          <Card title="Đóng góp theo scope" style={{ marginTop: 16 }}>
            {(data?.byScope.length ?? 0) === 0 ? (
              <Empty description="Chưa có dữ liệu" />
            ) : (
              <Space direction="vertical">
                {data?.byScope.map((s) => (
                  <Typography.Text key={`${s.scopeType}:${s.scopeId}`}>
                    {s.scopeName}: {s.count}
                  </Typography.Text>
                ))}
              </Space>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
