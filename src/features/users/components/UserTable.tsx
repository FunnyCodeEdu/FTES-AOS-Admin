import { Avatar, Space, Table, Tag } from "antd";
import type { TableProps } from "antd";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import type { UserRow } from "../types";

interface UserTableProps {
  data: UserRow[];
  loading: boolean;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  onChange: NonNullable<TableProps<UserRow>["onChange"]>;
}

export function UserTable({ data, loading, pagination, onChange }: UserTableProps) {
  const columns = [
    {
      title: "User",
      key: "user",
      render: (_: unknown, record: UserRow) => (
        <Space>
          <Avatar src={record.avatarUrl}>{record.fullName.charAt(0).toUpperCase()}</Avatar>
          <Link to={`/users/${record.id}`}>
            {record.fullName}
            <div style={{ fontSize: 12, color: "rgba(0,0,0,0.45)" }}>{record.email}</div>
          </Link>
        </Space>
      ),
      sorter: true,
    },
    {
      title: "Vai trò",
      key: "roles",
      render: (_: unknown, record: UserRow) => (
        <Space wrap>
          {record.roleNames.map((r) => (
            <Tag key={r}>{r}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (status: UserRow["status"]) => {
        const map: Record<UserRow["status"], { color: string; label: string }> = {
          active: { color: "green", label: "Đang hoạt động" },
          locked: { color: "red", label: "Đã khoá" },
          pending: { color: "orange", label: "Chờ xác nhận" },
        };
        const m =
          map[status] ??
          map[status?.toLowerCase?.() as UserRow["status"]] ??
          { color: "default", label: String(status ?? "") };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: "Campus",
      dataIndex: "campus",
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm"),
      sorter: true,
    },
  ];

  return (
    <Table
      rowKey="id"
      loading={loading}
      columns={columns}
      dataSource={data}
      pagination={{
        ...pagination,
        showSizeChanger: true,
        pageSizeOptions: [10, 20, 50],
        showTotal: (total) => `Tổng ${total} user`,
      }}
      onChange={onChange}
    />
  );
}
