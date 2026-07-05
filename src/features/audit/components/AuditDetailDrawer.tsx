import { Drawer, Skeleton, Empty, Descriptions, Table, Typography, Tag } from "antd";
import type { AuditEntryDetail } from "../shared/types";

interface AuditDetailDrawerProps {
  id: string | undefined;
  open: boolean;
  onClose: () => void;
  data?: AuditEntryDetail;
  isLoading: boolean;
}

function DiffView({ before, after }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  const beforeKeys = before ? Object.keys(before) : [];
  const afterKeys = after ? Object.keys(after) : [];
  const allKeys = Array.from(new Set([...beforeKeys, ...afterKeys]));

  if (allKeys.length === 0) {
    return <Typography.Text type="secondary">Không có dữ liệu thay đổi</Typography.Text>;
  }

  const columns = [
    { title: "Trường", dataIndex: "key", key: "key" },
    {
      title: "Trước",
      dataIndex: "before",
      key: "before",
      render: (value: unknown) => <Typography.Text>{formatValue(value)}</Typography.Text>,
    },
    {
      title: "Sau",
      dataIndex: "after",
      key: "after",
      render: (value: unknown) => <Typography.Text>{formatValue(value)}</Typography.Text>,
    },
  ];

  const dataSource = allKeys.map((key) => ({
    key,
    before: before?.[key],
    after: after?.[key],
    changed: JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]),
  }));

  return (
    <Table
      rowKey="key"
      columns={columns}
      dataSource={dataSource}
      pagination={false}
      size="small"
      onRow={(record) => ({
        style: record.changed ? { backgroundColor: "#fffbe6" } : undefined,
      })}
    />
  );
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "[object]";
  }
}

export function AuditDetailDrawer({ id, open, onClose, data, isLoading }: AuditDetailDrawerProps) {
  const isNotFound = !isLoading && open && id && !data;

  return (
    <Drawer title="Chi tiết audit log" width={640} open={open} onClose={onClose}>
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : isNotFound ? (
        <Empty description={`Không tìm thấy bản ghi ${id}`} />
      ) : data ? (
        <>
          <Descriptions bordered size="small" column={1} style={{ marginBottom: 24 }}>
            <Descriptions.Item label="ID">{data.id}</Descriptions.Item>
            <Descriptions.Item label="Actor">{data.actor.fullName}</Descriptions.Item>
            <Descriptions.Item label="Hành động">
              <Tag>{data.action}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Domain">{data.domain}</Descriptions.Item>
            <Descriptions.Item label="Target">{`${data.targetType} / ${data.targetId}`}</Descriptions.Item>
            <Descriptions.Item label="IP">{data.ip ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Thời gian">{new Date(data.createdAt).toLocaleString("vi-VN")}</Descriptions.Item>
          </Descriptions>

          <Typography.Title level={5}>Diff trước / sau</Typography.Title>
          <DiffView before={data.before} after={data.after} />

          {data.metadata && Object.keys(data.metadata).length > 0 && (
            <>
              <Typography.Title level={5} style={{ marginTop: 24 }}>
                Metadata
              </Typography.Title>
              <Descriptions bordered size="small" column={1}>
                {Object.entries(data.metadata).map(([key, value]) => (
                  <Descriptions.Item key={key} label={key}>
                    {formatValue(value)}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </>
          )}
        </>
      ) : null}
    </Drawer>
  );
}
