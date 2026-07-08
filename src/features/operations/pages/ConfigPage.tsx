import { useMemo, useState } from "react";
import { Alert, Button, Card, Input, Space, Table, Tabs, Tag, Typography } from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { groupByPrefix, useConfig, type ConfigItem } from "../api/config.api";
import type { TableProps } from "antd";

export default function ConfigPage() {
  const { data, isLoading, isError, error, refetch } = useConfig();
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    const items = data ?? [];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? items.filter(
          (e) => e.key.toLowerCase().includes(q) || (e.value ?? "").toLowerCase().includes(q)
        )
      : items;
    return groupByPrefix(filtered);
  }, [data, search]);

  return (
    <div>
      <Typography.Title level={3}>System Configuration</Typography.Title>
      <Alert
        type="info"
        message="Cấu hình hệ thống hiển thị ở chế độ chỉ đọc. Backend chưa cung cấp API chỉnh sửa cấu hình."
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm key/giá trị"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 240 }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Làm mới</Button>
        </Space>
      </Card>

      {isError && (
        <Alert type="error" message="Không thể tải cấu hình" description={error?.message} style={{ marginBottom: 16 }} />
      )}

      <Tabs
        items={groups.map((g) => ({
          key: g.group,
          label: g.group,
          children: <ConfigGroupTable items={g.items} loading={isLoading} />,
        }))}
      />
    </div>
  );
}

function ConfigGroupTable({ items, loading }: { items: ConfigItem[]; loading: boolean }) {
  const columns: TableProps<ConfigItem>["columns"] = [
    { title: "Key", dataIndex: "key", width: "35%" },
    {
      title: "Giá trị",
      dataIndex: "value",
      render: (_: unknown, record: ConfigItem) =>
        record.sensitive ? (
          <Tag color="orange">••• (nhạy cảm)</Tag>
        ) : (
          <Typography.Text code copyable style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {record.value ?? "—"}
          </Typography.Text>
        ),
    },
    {
      title: "Nhạy cảm",
      dataIndex: "sensitive",
      width: 120,
      render: (sensitive: boolean) =>
        sensitive ? <Tag color="red">Có</Tag> : <Tag>Không</Tag>,
    },
  ];

  return <Table rowKey="key" columns={columns} dataSource={items} loading={loading} pagination={false} />;
}
