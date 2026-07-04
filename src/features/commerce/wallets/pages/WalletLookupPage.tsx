import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Input,
  Space,
  Table,
  Typography,
} from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useUsers } from "../../../users/api/users.api";
import type { UserRow } from "../../../users/types";
import type { TableProps } from "antd";

export default function WalletLookupPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, error, refetch } = useUsers({
    search: search || undefined,
    page: 1,
    pageSize: 10,
  });

  useEffect(() => {
    const t = setTimeout(() => refetch(), 400);
    return () => clearTimeout(t);
  }, [search, refetch]);

  const columns: TableProps<UserRow>["columns"] = [
    { title: "Họ tên", dataIndex: "fullName" },
    { title: "Email", dataIndex: "email" },
    {
      title: "Thao tác",
      render: (_: unknown, record: UserRow) => (
        <Link to={`/commerce/wallets/${record.id}`}>
          <Button size="small">Mở ví</Button>
        </Link>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Tra cứu ví</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tên hoặc email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 320 }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Làm mới
          </Button>
        </Space>
      </Card>

      {isError && (
        <Alert
          type="error"
          message="Không thể tải danh sách ngưởi dùng"
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
        pagination={false}
      />
    </div>
  );
}
