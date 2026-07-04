import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useGroups } from "../api/community.api";
import type { Group } from "../shared/types";
import type { TableProps } from "antd";

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Locked", value: "locked" },
];

export default function GroupsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const status = searchParams.get("status") ?? undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 10);

  const { data, isLoading, isError, error, refetch } = useGroups({
    status,
    search: searchParams.get("search") ?? undefined,
    page,
    pageSize,
  });

  function updateParams(next: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    });
    setSearchParams(params);
  }

  const columns: TableProps<Group>["columns"] = [
    { title: "Tên group", dataIndex: "name", render: (_, r) => <Link to={`/community/groups/${r.id}`}>{r.name}</Link> },
    { title: "Owner", dataIndex: "ownerName" },
    { title: "Thành viên", dataIndex: "memberCount" },
    { title: "Trạng thái", dataIndex: "status", render: (s: string) => <Tag color={s === "locked" ? "red" : "green"}>{s}</Tag> },
    { title: "CTV", dataIndex: "ctvNames", render: (names: string[]) => names.join(", ") },
  ];

  return (
    <div>
      <Typography.Title level={3}>Community Groups</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm group"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => updateParams({ search: search || undefined, page: undefined })}
            style={{ width: 240 }}
          />
          <Select
            placeholder="Trạng thái"
            allowClear
            value={status}
            options={STATUS_OPTIONS}
            onChange={(value) => updateParams({ status: value, page: undefined })}
            style={{ width: 140 }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Làm mới</Button>
        </Space>
      </Card>

      {isError && (
        <Alert
          type="error"
          message="Không thể tải groups"
          description={error?.message}
          action={<Button icon={<ReloadOutlined />} onClick={() => refetch()}>Thử lại</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

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
