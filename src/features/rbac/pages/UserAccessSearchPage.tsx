import { useState } from "react";
import { Card, Input, Table, Tag, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { useRbacUsers } from "../api";
import type { UserAccessSummary } from "../types";

const PAGE_SIZE = 10;

export default function UserAccessSearchPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useRbacUsers(search, page, PAGE_SIZE);

  const columns = [
    {
      title: "Email",
      dataIndex: "email",
      render: (email: string, record: UserAccessSummary) => (
        <Link to={`/system/rbac/users/${record.userId}`}>{email}</Link>
      ),
    },
    { title: "Họ tên", dataIndex: "fullName" },
    {
      title: "Vai trò",
      dataIndex: "roles",
      render: (roles: string[]) => (
        <>
          {roles.map((r) => (
            <Tag key={r}>{r}</Tag>
          ))}
        </>
      ),
    },
    { title: "Số grant", dataIndex: "grantCount" },
  ];

  return (
    <div>
      <Typography.Title level={3}>Tra cứu quyền user</Typography.Title>
      <Card>
        <Input
          placeholder="Tìm theo email hoặc tên"
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          allowClear
          style={{ marginBottom: 16, maxWidth: 400 }}
        />
        <Table
          rowKey="userId"
          columns={columns}
          dataSource={data?.items ?? []}
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: data?.total ?? 0,
            onChange: setPage,
          }}
        />
      </Card>
    </div>
  );
}
