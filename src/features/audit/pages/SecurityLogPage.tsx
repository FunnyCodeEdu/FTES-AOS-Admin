import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, Card, DatePicker, Empty, Select, Skeleton, Table, Tag, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { useSecurityEvents } from "../api/audit.api";
import { SecurityEventDrawer } from "../components/SecurityEventDrawer";
import { SECURITY_EVENT_TYPES, type SecurityEvent, type SecurityEventType } from "../shared/types";

const { RangePicker } = DatePicker;

function useSecurityFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const type = (searchParams.get("type") as SecurityEventType | undefined) ?? undefined;
  const userId = searchParams.get("userId") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") ?? "10", 10) || 10);

  const setParam = useCallback(
    (key: string, value: string | undefined) => {
      setSearchParams(
        (prev) => {
          if (value) prev.set(key, value);
          else prev.delete(key);
          return prev;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setRange = useCallback(
    (dates: [Dayjs | null, Dayjs | null] | null) => {
      setSearchParams(
        (prev) => {
          if (dates && dates[0] && dates[1]) {
            prev.set("from", dates[0].format("YYYY-MM-DD"));
            prev.set("to", dates[1].format("YYYY-MM-DD"));
          } else {
            prev.delete("from");
            prev.delete("to");
          }
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

  const params = useMemo(
    () => ({
      page,
      pageSize,
      type,
      userId,
      from,
      to,
    }),
    [page, pageSize, type, userId, from, to]
  );

  return {
    ...params,
    setType: (value: SecurityEventType | undefined) => setParam("type", value),
    setUserId: (value: string) => setParam("userId", value || undefined),
    setRange,
    setPage,
  };
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
      title: "User",
      dataIndex: "userName",
      key: "userName",
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
      <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Select
          placeholder="Loại sự kiện"
          allowClear
          value={filters.type}
          onChange={(value) => filters.setType(value)}
          options={SECURITY_EVENT_TYPES}
          style={{ width: 200 }}
        />
        <Select
          placeholder="User ID"
          allowClear
          showSearch
          value={filters.userId}
          onChange={(value) => filters.setUserId(value)}
          options={[]}
          style={{ width: 200 }}
        />
        <RangePicker
          value={[
            filters.from ? dayjs(filters.from) : null,
            filters.to ? dayjs(filters.to) : null,
          ]}
          onChange={(dates) => filters.setRange(dates as [Dayjs | null, Dayjs | null] | null)}
        />
        <Button onClick={() => refetch()} icon={<ReloadOutlined />}>
          Làm mới
        </Button>
      </div>
      <Card>
        {isLoading ? (
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
            locale={{ emptyText: "Không có sự kiện nào trong khoảng thờii gian này" }}
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
