import { useMemo, useState } from "react";
import { Alert, Button, Card, Checkbox, Input, InputNumber, Space, Table, Tabs, Typography, message } from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { Can } from "../../../shared/permissions";
import { useConfig, useConfigHistory, useUpdateConfig } from "../api/config.api";
import { ConfigDiffModal } from "../components/ConfigDiffModal";
import type { ConfigEntry, ConfigGroup, ConfigValueType } from "../shared/types";
import type { TableProps } from "antd";

export default function ConfigPage() {
  const { data, isError, error, refetch } = useConfig();
  const updateConfig = useUpdateConfig();
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [pendingEntry, setPendingEntry] = useState<ConfigEntry | null>(null);
  const [pendingValue, setPendingValue] = useState<unknown>(null);
  const [diffOpen, setDiffOpen] = useState(false);

  const filteredGroups = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data
      .map((g) => ({ ...g, entries: g.entries.filter((e) => e.key.toLowerCase().includes(q) || (e.description ?? "").toLowerCase().includes(q)) }))
      .filter((g) => g.entries.length > 0);
  }, [data, search]);

  function handleSaveRequest(entry: ConfigEntry, newValue: unknown) {
    if (!validateValue(newValue, entry.type)) {
      message.error(`Giá trị không hợp lệ cho kiểu ${entry.type}`);
      return;
    }
    setPendingEntry(entry);
    setPendingValue(newValue);
    setDiffOpen(true);
  }

  function handleConfirm(reason: string) {
    if (!pendingEntry) return;
    updateConfig.mutate(
      { key: pendingEntry.key, value: pendingValue, type: pendingEntry.type, reason },
      {
        onSuccess: () => {
          message.success("Đã lưu cấu hình");
          setDiffOpen(false);
          setPendingEntry(null);
          setPendingValue(null);
        },
        onError: (err) => message.error(err.message),
      }
    );
  }

  return (
    <div>
      <Typography.Title level={3}>System Configuration</Typography.Title>
      <Alert type="warning" message="Chỉ Super Admin mới có quyền chỉnh sửa cấu hình hệ thống." showIcon style={{ marginBottom: 16 }} />
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
        <Alert type="error" message="Không thể tải cấu hình" description={error?.message} style={{ marginBottom: 16 }} />
      )}

      <Tabs
        items={filteredGroups.map((g) => ({
          key: g.group,
          label: g.group,
          children: <ConfigGroupTable group={g} onSave={handleSaveRequest} onViewHistory={setSelectedKey} />,
        }))}
      />

      {selectedKey && (
        <ConfigHistoryDrawer keyName={selectedKey} onClose={() => setSelectedKey(null)} />
      )}

      <ConfigDiffModal
        open={diffOpen}
        entry={pendingEntry}
        newValue={pendingValue}
        newType={pendingEntry?.type ?? "string"}
        onClose={() => setDiffOpen(false)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

function ConfigGroupTable({
  group,
  onSave,
  onViewHistory,
}: {
  group: ConfigGroup;
  onSave: (entry: ConfigEntry, newValue: unknown) => void;
  onViewHistory: (key: string) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, unknown>>({});

  const columns: TableProps<ConfigEntry>["columns"] = [
    { title: "Key", dataIndex: "key" },
    { title: "Mô tả", dataIndex: "description" },
    { title: "Kiểu", dataIndex: "type" },
    {
      title: "Giá trị",
      render: (_: unknown, record: ConfigEntry) => (
        <ConfigValueInput
          entry={record}
          draftValue={drafts[record.key]}
          onChange={(v) => setDrafts((prev) => ({ ...prev, [record.key]: v }))}
        />
      ),
    },
    {
      title: "Thao tác",
      render: (_: unknown, record: ConfigEntry) => (
        <Space>
          <Can permissions={["system.config.manage"]}>
            <Button
              type="primary"
              disabled={drafts[record.key] === undefined}
              onClick={() => onSave(record, drafts[record.key])}
            >
              Lưu
            </Button>
          </Can>
          <Button onClick={() => onViewHistory(record.key)}>Lịch sử</Button>
        </Space>
      ),
    },
  ];

  return <Table rowKey="key" columns={columns} dataSource={group.entries} pagination={false} />;
}

function ConfigValueInput({
  entry,
  draftValue,
  onChange,
}: {
  entry: ConfigEntry;
  draftValue: unknown;
  onChange: (value: unknown) => void;
}) {
  const currentValue = draftValue !== undefined ? draftValue : entry.value;
  if (entry.type === "boolean") {
    return <Checkbox checked={Boolean(currentValue)} onChange={(e) => onChange(e.target.checked)} />;
  }
  if (entry.type === "number") {
    return <InputNumber value={Number(currentValue)} onChange={(v) => onChange(v)} style={{ width: "100%" }} />;
  }
  if (entry.type === "json") {
    return (
      <Input.TextArea
        rows={2}
        value={typeof currentValue === "string" ? currentValue : JSON.stringify(currentValue, null, 2)}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return <Input value={String(currentValue ?? "")} onChange={(e) => onChange(e.target.value)} />;
}

function validateValue(value: unknown, type: ConfigValueType): boolean {
  if (type === "number") return !Number.isNaN(Number(value));
  if (type === "boolean") return typeof value === "boolean";
  if (type === "json") {
    try {
      if (typeof value === "string") JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  }
  return true;
}

function ConfigHistoryDrawer({ keyName, onClose }: { keyName: string; onClose: () => void }) {
  const { data, isLoading } = useConfigHistory(keyName);
  return (
    <Card title={`Lịch sử: ${keyName}`} style={{ marginTop: 16 }}>
      <Button onClick={onClose} style={{ marginBottom: 16 }}>Đóng</Button>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        columns={[
          { title: "Time", dataIndex: "occurredAt", render: (v: string) => new Date(v).toLocaleString() },
          { title: "Actor", dataIndex: "actorName" },
          { title: "Lý do", dataIndex: "reason" },
          { title: "Trước", dataIndex: "before", render: (v) => JSON.stringify(v) },
          { title: "Sau", dataIndex: "after", render: (v) => JSON.stringify(v) },
        ]}
        pagination={false}
      />
    </Card>
  );
}
