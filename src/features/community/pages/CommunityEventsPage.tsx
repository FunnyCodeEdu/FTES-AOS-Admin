import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { CheckOutlined, CloseOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Can } from "../../../shared/permissions";
import { useCommunityEvents, useReviewEvent } from "../api/community.api";
import type { CommunityEvent, EventReviewStatus } from "../shared/types";
import type { TableProps } from "antd";

const STATUS_OPTIONS: { label: string; value: EventReviewStatus }[] = [
  { label: "Chờ duyệt", value: "pending" },
  { label: "Đã duyệt", value: "approved" },
  { label: "Từ chối", value: "rejected" },
];

export default function CommunityEventsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [selected, setSelected] = useState<CommunityEvent | null>(null);
  const [approveTarget, setApproveTarget] = useState<CommunityEvent | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);

  const status = (searchParams.get("status") as EventReviewStatus | undefined) ?? undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 10);

  const { data, isLoading, isError, error, refetch } = useCommunityEvents({
    status,
    search: searchParams.get("search") ?? undefined,
    page,
    pageSize,
  });
  const review = useReviewEvent();

  function updateParams(next: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    });
    setSearchParams(params);
  }

  function openApprove(event: CommunityEvent) {
    setApproveTarget(event);
  }

  function handleApprove() {
    if (!approveTarget) return;
    review.mutate(
      { id: approveTarget.id, decision: "approve" },
      {
        onSuccess: () => {
          message.success("Đã duyệt event");
          setApproveTarget(null);
        },
        onError: (err) => message.error(err.message),
      }
    );
  }

  function openReject(event: CommunityEvent) {
    setSelected(event);
    setRejectReason("");
    setRejectOpen(true);
  }

  function handleReject() {
    if (!selected) return;
    if (!rejectReason.trim()) {
      message.error("Vui lòng nhập lý do từ chối");
      return;
    }
    review.mutate(
      { id: selected.id, decision: "reject", reason: rejectReason.trim() },
      {
        onSuccess: () => {
          message.success("Đã từ chối event");
          setRejectOpen(false);
          setSelected(null);
        },
        onError: (err) => message.error(err.message),
      }
    );
  }

  const columns: TableProps<CommunityEvent>["columns"] = [
    { title: "Tiêu đề", dataIndex: "title" },
    { title: "Group", dataIndex: "groupName" },
    { title: "Organizer", dataIndex: "organizerName" },
    { title: "Bắt đầu", dataIndex: "startAt", render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm") },
    { title: "Trạng thái", dataIndex: "status", render: (s: EventReviewStatus) => <Tag>{s}</Tag> },
    {
      title: "Thao tác",
      render: (_: unknown, record: CommunityEvent) => (
        <Space>
          <Button size="small" onClick={() => setSelected(record)}>Chi tiết</Button>
          {record.status === "pending" && (
            <Can permissions={["community.moderate"]}>
              <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => openApprove(record)}>
                Duyệt
              </Button>
              <Button size="small" danger icon={<CloseOutlined />} onClick={() => openReject(record)}>
                Từ chối
              </Button>
            </Can>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Community Events Review</Typography.Title>
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
            placeholder="Trạng thái"
            allowClear
            value={status}
            options={STATUS_OPTIONS}
            onChange={(value) => updateParams({ status: value, page: undefined })}
            style={{ width: 140 }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Làm mới</Button>
        </Space>
      </Card>

      {isError && (
        <Alert
          type="error"
          message="Không thể tải events"
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

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.title} width={480}>
        {selected && (
          <Space direction="vertical" style={{ width: "100%" }}>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="Group">{selected.groupName}</Descriptions.Item>
              <Descriptions.Item label="Organizer">{selected.organizerName}</Descriptions.Item>
              <Descriptions.Item label="Mô tả">{selected.description ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Địa điểm">{selected.location ?? selected.onlineLink ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Bắt đầu">{dayjs(selected.startAt).format("DD/MM/YYYY HH:mm")}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">{selected.status}</Descriptions.Item>
            </Descriptions>
            <Typography.Title level={5}>Lịch sử duyệt</Typography.Title>
            {selected.reviewHistory.map((h, idx) => (
              <div key={idx}>
                <Typography.Text>{h.decision} — {h.actorName} ({dayjs(h.occurredAt).format("DD/MM/YYYY HH:mm")})</Typography.Text>
                {h.reason && <Typography.Text type="secondary"> — {h.reason}</Typography.Text>}
              </div>
            ))}
          </Space>
        )}
      </Drawer>

      <Modal
        open={!!approveTarget}
        title="Duyệt event"
        onOk={handleApprove}
        onCancel={() => setApproveTarget(null)}
        confirmLoading={review.isPending}
        okText="Duyệt"
        cancelText="Huỷ"
      >
        <Typography.Text>
          Event <strong>{approveTarget?.title}</strong> sẽ được công khai cho cộng đồng. Tiếp tục?
        </Typography.Text>
      </Modal>

      {rejectOpen && (
        <Card title="Từ chối event" style={{ marginTop: 16 }}>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Typography.Text>
              Event: <strong>{selected?.title}</strong>
            </Typography.Text>
            <Input.TextArea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Lý do từ chối (bắt buộc)"
            />
            <Space>
              <Button type="primary" danger onClick={handleReject} loading={review.isPending}>
                Xác nhận từ chối
              </Button>
              <Button onClick={() => setRejectOpen(false)}>Huỷ</Button>
            </Space>
          </Space>
        </Card>
      )}
    </div>
  );
}
