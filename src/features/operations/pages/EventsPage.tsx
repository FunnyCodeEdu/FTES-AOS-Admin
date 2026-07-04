import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, Button, Card, Input, Select, Space, Table, Tag, Typography, message } from "antd";
import { EyeOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { Can } from "../../../shared/permissions";
import { useCreateEvent, useEvents } from "../api/events.api";
import { EventWizardModal } from "../components/EventWizardModal";
import type { OfficialEvent, OfficialEventType } from "../shared/types";
import type { TableProps } from "antd";

const TYPE_OPTIONS: { label: string; value: OfficialEventType }[] = [
  { label: "Webinar", value: "webinar" },
  { label: "Workshop", value: "workshop" },
  { label: "Hackathon", value: "hackathon" },
];

const STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Ongoing", value: "ongoing" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export default function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [wizardOpen, setWizardOpen] = useState(false);

  const type = (searchParams.get("type") as OfficialEventType) ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 10);

  const { data, isLoading, isError, error, refetch } = useEvents({
    type,
    status,
    search: searchParams.get("search") ?? undefined,
    page,
    pageSize,
  });
  const create = useCreateEvent();

  function updateParams(next: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    });
    setSearchParams(params);
  }

  function handleCreate(values: Parameters<typeof create.mutate>[0]) {
    create.mutate(values, {
      onSuccess: () => {
        message.success("Đã tạo event");
        setWizardOpen(false);
      },
      onError: (err) => message.error(err.message),
    });
  }

  const columns: TableProps<OfficialEvent>["columns"] = [
    { title: "Tiêu đề", dataIndex: "title" },
    { title: "Loại", dataIndex: "type" },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (s: string) => <Tag>{s}</Tag>,
    },
    {
      title: "Thao tác",
      render: (_: unknown, record: OfficialEvent) => (
        <Space>
          <Link to={`/operations/events/${record.id}`}>
            <Button size="small" icon={<EyeOutlined />}>Chi tiết</Button>
          </Link>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Official Events</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm event"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => updateParams({ search: search || undefined, page: undefined })}
            style={{ width: 240 }}
          />
          <Select
            placeholder="Loại"
            allowClear
            value={type}
            options={TYPE_OPTIONS}
            onChange={(value) => updateParams({ type: value, page: undefined })}
            style={{ width: 160 }}
          />
          <Select
            placeholder="Trạng thái"
            allowClear
            value={status}
            options={STATUS_OPTIONS}
            onChange={(value) => updateParams({ status: value, page: undefined })}
            style={{ width: 160 }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Làm mới</Button>
          <Can permissions={["operations.event.manage"]}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setWizardOpen(true)}>
              Tạo event
            </Button>
          </Can>
        </Space>
      </Card>

      {isError && (
        <Alert type="error" message="Không thể tải events" description={error?.message} style={{ marginBottom: 16 }} />
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

      <EventWizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSubmit={handleCreate}
        confirmLoading={create.isPending}
      />
    </div>
  );
}
