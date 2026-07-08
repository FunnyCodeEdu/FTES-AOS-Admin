import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, Button, Card, Empty, Input, Skeleton, Table, Tag, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useSecurityEvents } from "../api/audit.api";
import { SecurityEventDrawer } from "../components/SecurityEventDrawer";
import type { SecurityEvent } from "../shared/types";

function useSecurityFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const userId = searchParams.get("userId") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") ?? "10", 10) || 10);

  const setUserId = useCallback(
    (value: string | undefined) => {
      setSearchParams(
        (prev) => {
          if (value) prev.set("userId", value);
          else prev.delete("userId");
          prev.delete("page");
          return prev;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setPage = useCallback(
    (nextPage: number, nextPageSize: number) => {
      setSearchParams(
        (prev) => {
          prev.set("page", String(nextPage));
          prev.set("pageSize", String(nextPageSize));
          return prev;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const params = useMemo(() => ({ page, pageSize, userId }), [page, pageSize, userId]);

  return { ...params, setUserId, setPage };
}

function severityColor(severity: SecurityEvent["severity"]) {
  switch (severity) {
    case "critical":
      return "red";
    case "high":
      return "orange";
    case "medium":
      return "gold";
    case "low":
    default:
      return "blue";
  }
}

export default function SecurityLogPage() {
  const filters = useSecurityFilters();
  const [userIdInput, setUserIdInput] = useState(filters.userId ?? "");
  const { data, isLoading, isError, error, refetch } = useSecurityEvents(filters);
  const [selected, setSelected] = useState<SecurityEvent | undefined>(undefined);

  const columns = [
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: "IP",
      dataIndex: "ip",
      key: "ip",
    },
    {
      title: "Thiết bị",
      dataIndex: "device",
      key: "device",
    },
    {
      title: "Mức độ",
      dataIndex: "severity",
      key: "severity",
      render: (severity: SecurityEvent["severity"]) => <Tag color={severityColor(severity)}>{severity}</Tag>,
    },
    {
      title: "Thời gian",
      dataIndex: "timestamp",
      key: "timestamp",
      render: (value: string) => (
        <Typography.Text title={new Date(value).toISOString()}>
          {dayjs(value).format("DD/MM/YYYY HH:mm")}
        </Typography.Text>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Security log</Typography.Title>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Nhật ký bảo mật được tra cứu theo từng user. Nhập User ID để xem lịch sử đăng nhập / 2FA / phiên / thiết bị / khoá tài khoản."
      />
      <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Input.Search
          placeholder="User ID (UUID)"
          allowClear
          value={userIdInput}
          onChange={(e) => setUserIdInput(e.target.value)}
          onSearch={(value) => filters.setUserId(value.trim() || undefined)}
          enterButton="Tra cứu"
          style={{ width: 360 }}
        />
        <Button onClick={() => refetch()} icon={<ReloadOutlined />} disabled={!filters.userId}>
          Làm mới
        </Button>
      </div>
      <Card>
        {!filters.userId ? (
          <Empty description="Nhập User ID để xem nhật ký bảo mật của người dùng" />
        ) : isLoading ? (
          <Skeleton active paragraph={{ rows: 5 }} />
        ) : isError ? (
          <Empty description={error?.message ?? "Lỗi tải security log"}>
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
              onClick: () => setSelected(record),
              style: { cursor: "pointer" },
            })}
            locale={{ emptyText: "Không có sự kiện bảo mật nào cho user này" }}
          />
        )}
      </Card>
      <SecurityEventDrawer
        event={selected}
        open={!!selected}
        onClose={() => setSelected(undefined)}
        isLoading={false}
      />
    </div>
  );
}
