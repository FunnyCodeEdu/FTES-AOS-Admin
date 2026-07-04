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
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { EyeOutlined, ReloadOutlined, SearchOutlined, SendOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Can } from "../../../shared/permissions";
import {
  useBroadcasts,
  useCancelBroadcast,
  useCreateBroadcast,
  usePreviewBroadcast,
} from "../api/notifications.api";
import { BroadcastPreview } from "../components/BroadcastPreview";
import { BroadcastSendConfirmModal } from "../components/BroadcastSendConfirmModal";
import { CancelBroadcastModal } from "../components/CancelBroadcastModal";
import { SegmentBuilder } from "../components/SegmentBuilder";
import { useBroadcastDraftStore } from "../store/broadcastDraftStore";
import type { Broadcast, BroadcastChannel } from "../shared/types";
import type { TableProps } from "antd";

const CHANNEL_OPTIONS: { label: string; value: BroadcastChannel }[] = [
  { label: "In-app", value: "in-app" },
  { label: "Email", value: "email" },
  { label: "Push", value: "push" },
];

const STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Sending", value: "sending" },
  { label: "Sent", value: "sent" },
  { label: "Cancelled", value: "cancelled" },
];

export default function NotificationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState((searchParams.get("tab") as "compose" | "history") ?? "compose");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Broadcast | null>(null);

  const { draft, setDraft, resetDraft } = useBroadcastDraftStore();
  const status = searchParams.get("status") ?? undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 10);

  const preview = usePreviewBroadcast(draft.segment);
  const create = useCreateBroadcast();
  const cancel = useCancelBroadcast();
  const { data, isLoading, isError, error, refetch } = useBroadcasts({
    status,
    search: searchParams.get("search") ?? undefined,
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

  function validateSchedule(): boolean {
    if (draft.scheduleAt && dayjs(draft.scheduleAt).isBefore(dayjs())) {
      message.error("Time lên lịch phải sau thờber điểm hiện tại");
      return false;
    }
    return true;
  }

  function handlePreview() {
    if (!draft.title.trim() || draft.channels.length === 0) {
      message.error("Vui lòng nhập tiêu đề và chọn ít nhất một kênh");
      return;
    }
    if (!validateSchedule()) return;
    preview.refetch();
  }

  function openSendConfirm() {
    if (preview.data?.recipientCount === 0) {
      message.error("Segment không có user nhận");
      return;
    }
    if (!validateSchedule()) return;
    setSendConfirmOpen(true);
  }

  function handleSend() {
    if (!draft.title.trim() || draft.channels.length === 0) return;
    if (!validateSchedule()) return;
    create.mutate(
      {
        title: draft.title,
        content: draft.content,
        channels: draft.channels,
        segment: draft.segment,
        scheduleAt: draft.scheduleAt,
      },
      {
        onSuccess: () => {
          message.success("Đã gửi broadcast");
          resetDraft();
          setSendConfirmOpen(false);
          setActiveTab("history");
          updateParams({ tab: "history" });
        },
        onError: (err) => message.error(err.message),
      }
    );
  }

  function handleCancel() {
    if (!cancelTarget) return;
    cancel.mutate(cancelTarget.id, {
      onSuccess: () => {
        message.success("Đã huỷ broadcast");
        setCancelTarget(null);
      },
      onError: (err) => message.error(err.message),
    });
  }

  const columns: TableProps<Broadcast>["columns"] = [
    { title: "Tiêu đề", dataIndex: "title" },
    { title: "Kênh", dataIndex: "channels", render: (v: string[]) => v.join(", ") },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (s: string) => <Tag>{s}</Tag>,
    },
    {
      title: "Stats",
      render: (_: unknown, record: Broadcast) =>
        `${record.stats.sent}/${record.stats.delivered}/${record.stats.read}`,
    },
    {
      title: "Thao tác",
      render: (_: unknown, record: Broadcast) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setSelectedBroadcast(record)}>
            Chi tiết
          </Button>
          {record.status === "scheduled" && (
            <Can permissions={["operations.notification.send"]}>
              <Button size="small" danger onClick={() => setCancelTarget(record)}>
                Huỷ lịch
              </Button>
            </Can>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Notification Broadcast</Typography.Title>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key as "compose" | "history");
          updateParams({ tab: key });
        }}
        items={[
          {
            key: "compose",
            label: "Soạn broadcast",
            children: (
              <Can permissions={["operations.notification.send"]} fallback={<Alert type="warning" message="Bạn không có quyền gửi broadcast" showIcon />}>
                <Card>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Input
                      placeholder="Tiêu đề"
                      value={draft.title}
                      onChange={(e) => setDraft({ title: e.target.value })}
                    />
                    <Input.TextArea
                      rows={4}
                      placeholder="Nội dung"
                      value={draft.content}
                      onChange={(e) => setDraft({ content: e.target.value })}
                    />
                    <Select
                      mode="multiple"
                      placeholder="Kênh gửi"
                      options={CHANNEL_OPTIONS}
                      value={draft.channels}
                      onChange={(channels) => setDraft({ channels })}
                      style={{ width: "100%" }}
                    />
                    <SegmentBuilder
                      value={draft.segment}
                      onChange={(segment) => setDraft({ segment })}
                    />
                    <Space>
                      <Typography.Text>Lên lịch:</Typography.Text>
                      <DatePicker
                        showTime
                        value={draft.scheduleAt ? dayjs(draft.scheduleAt) : null}
                        onChange={(d) => setDraft({ scheduleAt: d?.toISOString() })}
                        disabledDate={(d) => d.isBefore(dayjs(), "day")}
                        disabledTime={() => ({ disabledHours: () => [], disabledMinutes: () => [], disabledSeconds: () => [] })}
                      />
                    </Space>
                    <Space>
                      <Button icon={<SearchOutlined />} onClick={handlePreview} loading={preview.isFetching}>
                        Preview
                      </Button>
                      <Button type="primary" icon={<SendOutlined />} onClick={openSendConfirm} disabled={!preview.data || preview.data.recipientCount === 0}>
                        Gửi
                      </Button>
                    </Space>
                    <BroadcastPreview
                      data={preview.data}
                      isLoading={preview.isFetching}
                      isError={preview.isError}
                      error={preview.error}
                    />
                  </Space>
                </Card>
              </Can>
            ),
          },
          {
            key: "history",
            label: "Lịch sử",
            children: (
              <>
                <Card style={{ marginBottom: 16 }}>
                  <Space wrap>
                    <Input
                      prefix={<SearchOutlined />}
                      placeholder="Tìm tiêu đề"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onPressEnter={() => updateParams({ search: search || undefined, page: undefined })}
                      style={{ width: 240 }}
                    />
                    <Select
                      placeholder="Trạng thái"
                      allowClear
                      value={status}
                      options={STATUS_OPTIONS}
                      onChange={(value) => updateParams({ status: value, page: undefined })}
                      style={{ width: 160 }}
                    />
                    <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                      Làm mới
                    </Button>
                  </Space>
                </Card>
                {isError && (
                  <Alert type="error" message="Không thể tải lịch sử" description={error?.message} style={{ marginBottom: 16 }} />
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
              </>
            ),
          },
        ]}
      />

      <BroadcastSendConfirmModal
        open={sendConfirmOpen}
        title={draft.title}
        recipientCount={preview.data?.recipientCount ?? 0}
        channels={draft.channels}
        onClose={() => setSendConfirmOpen(false)}
        onConfirm={handleSend}
        confirmLoading={create.isPending}
      />

      <CancelBroadcastModal
        open={!!cancelTarget}
        title={cancelTarget?.title ?? ""}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        confirmLoading={cancel.isPending}
      />

      <Drawer open={!!selectedBroadcast} onClose={() => setSelectedBroadcast(null)} title={selectedBroadcast?.title} width={480}>
        {selectedBroadcast && (
          <Space direction="vertical" style={{ width: "100%" }}>
            <Typography.Text>Nội dung: {selectedBroadcast.content}</Typography.Text>
            <Typography.Text>Kênh: {selectedBroadcast.channels.join(", ")}</Typography.Text>
            <Typography.Text>Trạng thái: {selectedBroadcast.status}</Typography.Text>
            <Typography.Text>
              Stats: {selectedBroadcast.stats.sent} sent / {selectedBroadcast.stats.delivered} delivered /{" "}
              {selectedBroadcast.stats.read} read
            </Typography.Text>
            <Typography.Text>Segment: {JSON.stringify(selectedBroadcast.segment)}</Typography.Text>
          </Space>
        )}
      </Drawer>
    </div>
  );
}
