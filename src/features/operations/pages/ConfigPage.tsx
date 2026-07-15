import { useMemo, useState } from "react";
import { Alert, Button, Card, Input, Modal, Space, Table, Tabs, Tag, Typography, message } from "antd";
import { EditOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { Can } from "../../../shared/permissions";
import { groupByPrefix, useConfig, useUpdateConfig, type ConfigItem } from "../api/config.api";
import type { TableProps } from "antd";

export default function ConfigPage() {
  const { data, isLoading, isError, error, refetch } = useConfig();
  const updateConfig = useUpdateConfig();
  const [search, setSearch] = useState("");
  const [editItem, setEditItem] = useState<ConfigItem | null>(null);
  const [newValue, setNewValue] = useState("");

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

  function openEdit(item: ConfigItem) {
    setEditItem(item);
    // Key nhạy cảm: BE không trả giá trị thật → bắt đầu từ chuỗi rỗng, lưu sẽ GHI ĐÈ.
    setNewValue(item.sensitive ? "" : item.value ?? "");
  }

  function handleSave() {
    if (!editItem) return;
    updateConfig.mutate(
      { key: editItem.key, value: newValue },
      {
        onSuccess: () => {
          message.success(`Đã cập nhật cấu hình ${editItem.key}`);
          setEditItem(null);
        },
      }
    );
  }

  return (
    <div>
      <Typography.Title level={3}>System Configuration</Typography.Title>
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
          children: <ConfigGroupTable items={g.items} loading={isLoading} onEdit={openEdit} />,
        }))}
      />

      <Modal
        open={!!editItem}
        title={`Sửa cấu hình: ${editItem?.key ?? ""}`}
        onCancel={() => setEditItem(null)}
        okText="Lưu"
        cancelText="Huỷ"
        confirmLoading={updateConfig.isPending}
        onOk={handleSave}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          {editItem?.sensitive ? (
            <Alert
              type="warning"
              showIcon
              message="Key nhạy cảm — giá trị hiện tại bị ẩn. Bấm Lưu sẽ GHI ĐÈ giá trị mới."
            />
          ) : (
            <div>
              <Typography.Text type="secondary">Giá trị hiện tại</Typography.Text>
              <pre style={{ background: "rgba(0,0,0,0.04)", padding: 8, borderRadius: 4, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                {editItem?.value ?? "—"}
              </pre>
            </div>
          )}
          <Typography.Text type="secondary">Giá trị mới</Typography.Text>
          <Input.TextArea
            rows={4}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Nhập giá trị mới (chuỗi thô, thường là JSON)"
          />
        </Space>
      </Modal>
    </div>
  );
}

function ConfigGroupTable({
  items,
  loading,
  onEdit,
}: {
  items: ConfigItem[];
  loading: boolean;
  onEdit: (item: ConfigItem) => void;
}) {
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
    {
      title: "",
      width: 90,
      render: (_: unknown, record: ConfigItem) => (
        <Can permissions={["admin.config.manage"]}>
          <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(record)}>
            Sửa
          </Button>
        </Can>
      ),
    },
  ];

  return <Table rowKey="key" columns={columns} dataSource={items} loading={loading} pagination={false} />;
}
