import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, Button, Card, Input, Space, Table, Tag, Typography } from "antd";
import { EyeOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { useMembers } from "../api/members.api";
import type { CtvMember } from "../shared/types";
import type { TableProps } from "antd";

export default function MemberListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 10);

  const { data, isLoading, isError, error, refetch } = useMembers({ search: searchParams.get("search") ?? undefined, page, pageSize });

  function updateParams(next: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    });
    setSearchParams(params);
  }

  const columns: TableProps<CtvMember>["columns"] = [
    { title: "User", dataIndex: "fullName" },
    { title: "Email", dataIndex: "email" },
    {
      title: "Scopes",
      render: (_: unknown, record: CtvMember) => record.scopes.map((s) => s.scopeName).join(", "),
    },
    { title: "Active grants", dataIndex: "activeGrantCount" },
    {
      title: "Hạn gần nhất",
      dataIndex: "nearestExpiry",
      render: (v: string | undefined) => {
        if (!v) return "—";
        const days = dayjs(v).diff(dayjs(), "day");
        return days < 7 ? <Tag color="orange">{dayjs(v).format("DD/MM/YYYY")} ({days} ngày)</Tag> : dayjs(v).format("DD/MM/YYYY");
      },
    },
    {
      title: "KPI 30d",
      render: (_: unknown, record: CtvMember) => `${record.kpi30d.resourcesProcessed}/${record.kpi30d.postsModerated}`,
    },
    {
      title: "Thao tác",
      render: (_: unknown, record: CtvMember) => (
        <Link to={`/ctv-program/members/${record.id}`}>
          <Button size="small" icon={<EyeOutlined />}>Chi tiết</Button>
        </Link>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>CTV Members</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm user/email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => updateParams({ search: search || undefined, page: undefined })}
            style={{ width: 240 }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Làm mới</Button>
        </Space>
      </Card>

      {isError && <Alert type="error" message="Không thể tải members" description={error?.message} style={{ marginBottom: 16 }} />}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total: data?.total ?? 0,
          onChange: (p, ps) => updateParams({ page: p, pageSize: ps }),
        }}
      />
    </div>
  );
}
