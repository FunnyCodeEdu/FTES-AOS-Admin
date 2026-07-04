import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Drawer,
  Input,
  Select,
  Space,
  Table,
  Typography,
} from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useModerationLog } from "../api/moderation.api";
import type { ModLogEntry } from "../../community/shared/types";
import type { TableProps } from "antd";

const ACTION_OPTIONS = [
  { label: "approve", value: "approve" },
  { label: "reject", value: "reject" },
  { label: "remove", value: "remove" },
  { label: "escalate", value: "escalate" },
];

export default function ModerationLogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [selected, setSelected] = useState<ModLogEntry | null>(null);

  const action = searchParams.get("action") ?? undefined;
  const targetType = searchParams.get("targetType") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 10);

  const { data, isLoading, isError, error, refetch } = useModerationLog({
    action,
    targetType,
    from,
    to,
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

  const columns: TableProps<ModLogEntry>["columns"] = [
    { title: "Thởi gian", dataIndex: "createdAt", render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm") },
    { title: "Actor", dataIndex: "actorName" },
    { title: "Hành động", dataIndex: "action" },
    { title: "Đối tượng", dataIndex: "targetType" },
    { title: "Mục tiêu", dataIndex: "targetTitle" },
    { title: "Lý do", dataIndex: "reason", ellipsis: true },
    {
      title: "Thao tác",
      render: (_: unknown, record: ModLogEntry) => (
        <Button size="small" onClick={() => setSelected(record)}>Chi tiết</Button>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Moderation Log</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm actor hoặc mục tiêu"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => updateParams({ search: search || undefined, page: undefined })}
            style={{ width: 240 }}
          />
          <Select
            placeholder="Hành động"
            allowClear
            value={action}
            options={ACTION_OPTIONS}
            onChange={(value) => updateParams({ action: value, page: undefined })}
            style={{ width: 140 }}
          />
          <Select
            placeholder="Loại đối tượng"
            allowClear
            value={targetType}
            options={[{ label: "post", value: "post" }, { label: "comment", value: "comment" }, { label: "resource", value: "resource" }]}
            onChange={(value) => updateParams({ targetType: value, page: undefined })}
            style={{ width: 140 }}
          />
          <DatePicker.RangePicker
            value={[
              from ? dayjs(from) : null,
              to ? dayjs(to) : null,
            ]}
            onChange={(range) => {
              updateParams({
                from: range?.[0]?.toISOString(),
                to: range?.[1]?.toISOString(),
                page: undefined,
              });
            }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Làm mới</Button>
        </Space>
      </Card>

      {isError && (
        <Alert
          type="error"
          message="Không thể tải log"
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

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Chi tiết log" width={480}>
        {selected && (
          <Space direction="vertical" style={{ width: "100%" }}>
            <Typography.Text>Actor: <strong>{selected.actorName}</strong></Typography.Text>
            <Typography.Text>Hành động: <strong>{selected.action}</strong></Typography.Text>
            <Typography.Text>Đối tượng: {selected.targetType} — {selected.targetTitle}</Typography.Text>
            <Typography.Text>Target ID: {selected.targetId}</Typography.Text>
            <Typography.Text>Lý do: {selected.reason ?? "—"}</Typography.Text>
            <Typography.Text>Thởi gian: {dayjs(selected.createdAt).format("DD/MM/YYYY HH:mm:ss")}</Typography.Text>
          </Space>
        )}
      </Drawer>
    </div>
  );
}
