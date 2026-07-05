import { useState } from "react";
import { Card, Table, Skeleton, Empty, Button, Tag, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuditLog, useAuditLogs } from "../api/audit.api";
import { AuditDetailDrawer } from "../components/AuditDetailDrawer";
import { AuditLogFilters, useAuditFilters } from "../components/AuditLogFilters";

export default function AuditLogPage() {
  const filters = useAuditFilters();
  const { data, isLoading, isError, error, refetch } = useAuditLogs(filters);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const { data: detail, isLoading: detailLoading } = useAuditLog(selectedId);

  const columns = [
    {
      title: "Actor",
      dataIndex: "actor",
      key: "actor",
      render: (actor: { fullName: string; email?: string }) => (
        <div>
          <Typography.Text strong>{actor.fullName}</Typography.Text>
          {actor.email && <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{actor.email}</Typography.Text></div>}
        </div>
      ),
    },
    {
      title: "Hành động",
      dataIndex: "action",
      key: "action",
      render: (action: string) => <Tag>{action}</Tag>,
    },
    {
      title: "Domain",
      dataIndex: "domain",
      key: "domain",
    },
    {
      title: "Target",
      dataIndex: "targetType",
      key: "targetType",
      render: (_: string, record: { targetType: string; targetId: string }) =>
        `${record.targetType} / ${record.targetId}`,
    },
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value: string) => (
        <Typography.Text title={new Date(value).toISOString()}>
          {dayjs(value).format("DD/MM/YYYY HH:mm")}
        </Typography.Text>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Audit log</Typography.Title>
      <AuditLogFilters className="audit-filters" />
      <Card>
        {isLoading ? (
          <Skeleton active paragraph={{ rows: 5 }} />
        ) : isError ? (
          <Empty description={error?.message ?? "Lỗi tải audit log"}>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              Thử lại
            </Button>
          </Empty>
        ) : (
          <Table
            rowKey="id"
            columns={columns}
            dataSource={data?.items ?? []}
            pagination={{
              current: filters.page,
              pageSize: filters.pageSize,
              total: data?.total ?? 0,
              showSizeChanger: true,
            }}
            onChange={(p) => filters.setPage(p.current ?? 1, p.pageSize ?? 10)}
            onRow={(record) => ({
              onClick: () => setSelectedId(record.id),
              style: { cursor: "pointer" },
            })}
            locale={{ emptyText: "Không có bản ghi nào khớp bộ lọc" }}
          />
        )}
      </Card>
      <AuditDetailDrawer
        id={selectedId}
        open={!!selectedId}
        onClose={() => setSelectedId(undefined)}
        data={detail}
        isLoading={detailLoading}
      />
    </div>
  );
}
