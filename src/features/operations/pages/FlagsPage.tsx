import { useState } from "react";
import { Alert, Button, Card, Input, Space, Switch, Table, Tag, Typography, message } from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { Can } from "../../../shared/permissions";
import { useFlags, useUpdateFlag } from "../api/flags.api";
import { FlagEditModal } from "../components/FlagEditModal";
import type { BroadcastSegment, Flag, FlagEnv } from "../shared/types";
import type { TableProps } from "antd";

export default function FlagsPage() {
  const [search, setSearch] = useState("");
  const [editFlag, setEditFlag] = useState<Flag | null>(null);
  const [editEnv, setEditEnv] = useState<FlagEnv>("dev");
  const { data, isLoading, isError, error, refetch } = useFlags();
  const update = useUpdateFlag();

  const filtered = (data ?? []).filter(
    (f) => f.key.toLowerCase().includes(search.toLowerCase()) || f.description.toLowerCase().includes(search.toLowerCase())
  );

  function handleUpdate(values: {
    enabled: boolean;
    rolloutPercent: number;
    targetSegment?: BroadcastSegment;
    reason: string;
  }) {
    if (!editFlag) return;
    update.mutate(
      { key: editFlag.key, env: editEnv, ...values },
      {
        onSuccess: () => {
          message.success("Đã cập nhật flag");
          setEditFlag(null);
        },
        onError: (err) => {
          message.error(err.message);
          refetch();
        },
      }
    );
  }

  const columns: TableProps<Flag>["columns"] = [
    { title: "Key", dataIndex: "key" },
    { title: "Mô tả", dataIndex: "description" },
    {
      title: "Dev",
      render: (_: unknown, record: Flag) => renderEnvCell(record, "dev"),
    },
    {
      title: "Staging",
      render: (_: unknown, record: Flag) => renderEnvCell(record, "staging"),
    },
    {
      title: "Prod",
      render: (_: unknown, record: Flag) => renderEnvCell(record, "prod"),
    },
  ];

  function renderEnvCell(record: Flag, env: FlagEnv) {
    const state = record.envs[env];
    return (
      <Space>
        <Can permissions={["admin.feature-flag.manage"]}>
          <Switch
            checked={state.enabled}
            onChange={() => { setEditFlag(record); setEditEnv(env); }}
          />
        </Can>
        <Typography.Text type={env === "prod" ? "danger" : undefined}>
          {state.enabled ? `${state.rolloutPercent}%` : "off"}
        </Typography.Text>
        {env === "prod" && state.enabled && <Tag color="red">prod</Tag>}
      </Space>
    );
  }

  return (
    <div>
      <Typography.Title level={3}>Feature Toggles</Typography.Title>
      <Alert
        type="info"
        message="Thay đổi flag trên production yêu cầu lý do và xác nhận rõ ràng."
        style={{ marginBottom: 16 }}
      />
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

      <FlagEditModal
        open={!!editFlag}
        flag={editFlag}
        env={editEnv}
        onClose={() => setEditFlag(null)}
        onConfirm={handleUpdate}
        confirmLoading={update.isPending}
      />
    </div>
  );
}
