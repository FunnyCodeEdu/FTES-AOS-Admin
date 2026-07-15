import { useState } from "react";
import { Alert, Button, Card, Input, Space, Table, Tag, Typography } from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useFlags, type FlagItem } from "../api/flags.api";
import { FlagEditModal } from "../components/FlagEditModal";
import type { TableProps } from "antd";

export default function FlagsPage() {
  const [search, setSearch] = useState("");
  const [viewFlag, setViewFlag] = useState<FlagItem | null>(null);
  const { data, isLoading, isError, error, refetch } = useFlags();

  const filtered = (data ?? []).filter(
    (f) =>
      f.key.toLowerCase().includes(search.toLowerCase()) ||
      (f.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const columns: TableProps<FlagItem>["columns"] = [
    { title: "Key", dataIndex: "key", width: "30%" },
    {
      title: "Mô tả",
      dataIndex: "description",
      render: (description: string | null) => description ?? <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: "Trạng thái",
      dataIndex: "enabled",
      width: 140,
      render: (enabled: boolean) =>
        enabled ? <Tag color="green">Đang bật</Tag> : <Tag>Đang tắt</Tag>,
    },
    {
      title: "",
      width: 100,
      render: (_: unknown, record: FlagItem) => (
        <Button size="small" onClick={() => setViewFlag(record)}>Chi tiết</Button>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Feature Toggles</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm key/mô tả"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 240 }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Làm mới</Button>
        </Space>
      </Card>

      {isError && (
        <Alert type="error" message="Không thể tải flags" description={error?.message} style={{ marginBottom: 16 }} />
      )}

      <Table
        rowKey="key"
        columns={columns}
        dataSource={filtered}
        loading={isLoading}
        pagination={false}
      />

      <FlagEditModal open={!!viewFlag} flag={viewFlag} onClose={() => setViewFlag(null)} />
    </div>
  );
}
