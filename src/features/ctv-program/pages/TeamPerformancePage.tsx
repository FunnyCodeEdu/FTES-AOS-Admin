import { useSearchParams } from "react-router-dom";
import { Alert, Button, Card, Select, Space, Table, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { useTeamPerformance } from "../api/performance.api";
import type { TableProps } from "antd";
import type { TeamPerformanceMember } from "../shared/types";

const RANGE_OPTIONS = [
  { label: "7 ngày", value: "7d" },
  { label: "30 ngày", value: "30d" },
  { label: "90 ngày", value: "90d" },
];

export default function TeamPerformancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const range = searchParams.get("range") ?? "30d";
  const { data, isLoading, isError, error, refetch } = useTeamPerformance({ range });

  function updateParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, value);
    });
    setSearchParams(params);
  }

  const columns: TableProps<TeamPerformanceMember>["columns"] = [
    { title: "CTV", dataIndex: "fullName" },
    { title: "Email", dataIndex: "email" },
    { title: "Resources", dataIndex: "resourcesProcessed" },
    { title: "Posts moderated", dataIndex: "postsModerated" },
    { title: "Score", dataIndex: "score" },
    {
      title: "Drill-down",
      render: (_: unknown, record: TeamPerformanceMember) => (
        <Link to={`/ctv-program/members/${record.memberId}`}>
          <Button size="small">Xem profile</Button>
        </Link>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Hiệu suất đội CTV</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select value={range} options={RANGE_OPTIONS} onChange={(value) => updateParams({ range: value })} style={{ width: 160 }} />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Làm mới</Button>
        </Space>
      </Card>

      {isError && <Alert type="error" message="Không thể tải hiệu suất" description={error?.message} style={{ marginBottom: 16 }} />}

      <Table
        rowKey="memberId"
        columns={columns}
        dataSource={data ?? []}
        loading={isLoading}
        pagination={false}
      />
    </div>
  );
}
