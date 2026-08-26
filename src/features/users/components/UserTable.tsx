import { Avatar, Button, Space, Tag } from "antd";
import type { TableProps } from "antd";
import { Link, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { MobileCard } from "../../../shared/components/MobileCard";
import { ResponsiveTable } from "../../../shared/components/ResponsiveTable";
import type { UserRow } from "../types";

const STATUS_META: Record<string, { color: string; label: string }> = {
  active: { color: "green", label: "Đang hoạt động" },
  locked: { color: "red", label: "Đã khoá" },
  pending: { color: "orange", label: "Chờ xác nhận" },
};

function statusMeta(status: UserRow["status"]) {
  return (
    STATUS_META[status] ??
    STATUS_META[String(status ?? "").toLowerCase()] ?? {
      color: "default",
      label: String(status ?? ""),
    }
  );
}

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
  const navigate = useNavigate();
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
        const m = statusMeta(status);
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
    <ResponsiveTable<UserRow>
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
      renderMobileCard={(user) => {
        const m = statusMeta(user.status);
        return (
          <MobileCard
            title={
              <Space>
                <Avatar size="small" src={user.avatarUrl}>
                  {user.fullName.charAt(0).toUpperCase()}
                </Avatar>
                {user.fullName}
              </Space>
            }
            subtitle={
              <>
                <Tag color={m.color} style={{ marginInlineEnd: 6 }}>
                  {m.label}
                </Tag>
                {user.email}
              </>
            }
            meta={[
              { label: "Vai trò", value: user.roleNames.join(", ") || "—" },
              { label: "Campus", value: user.campus || "—" },
            ]}
            primaryAction={
              <Button block size="large" onClick={() => navigate(`/users/${user.id}`)}>
                Mở hồ sơ
              </Button>
            }
          />
        );
      }}
    />
  );
}
