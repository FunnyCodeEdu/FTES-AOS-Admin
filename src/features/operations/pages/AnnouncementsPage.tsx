import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, Button, Card, Input, Modal, Select, Space, Table, Tag, Typography, message } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { Can } from "../../../shared/permissions";
import { useAnnouncements, useCreateAnnouncement, useDeleteAnnouncement, useUpdateAnnouncement } from "../api/announcements.api";
import { AnnouncementFormModal } from "../components/AnnouncementFormModal";
import type { Announcement, AnnouncementLevel, AnnouncementScopeType } from "../shared/types";
import type { TableProps } from "antd";

const SCOPE_OPTIONS: { label: string; value: AnnouncementScopeType }[] = [
  { label: "Toàn hệ thống", value: "system" },
  { label: "Môn học", value: "subject" },
  { label: "Group", value: "group" },
];

const LEVEL_TAG: Record<AnnouncementLevel, string> = {
  info: "blue",
  warning: "orange",
  critical: "red",
};

export default function AnnouncementsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

  const scopeType = (searchParams.get("scopeType") as AnnouncementScopeType) ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 10);

  const { data, isLoading, isError, error, refetch } = useAnnouncements({
    scopeType,
    status,
    search: searchParams.get("search") ?? undefined,
    page,
    pageSize,
  });
  const create = useCreateAnnouncement();
  const update = useUpdateAnnouncement();
  const remove = useDeleteAnnouncement();

  function updateParams(next: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    });
    setSearchParams(params);
  }

  function handleSubmit(values: {
    content: string;
    level: AnnouncementLevel;
    scopeType: AnnouncementScopeType;
    scopeId?: string;
    activeFrom?: string;
    activeTo?: string;
  }) {
    const onSuccess = () => {
      message.success(editing ? "Đã cập nhật announcement" : "Đã tạo announcement");
      setModalOpen(false);
      setEditing(null);
    };
    if (editing) {
      update.mutate({ id: editing.id, ...values }, { onSuccess, onError: (err) => message.error(err.message) });
    } else {
      create.mutate(values, { onSuccess, onError: (err) => message.error(err.message) });
    }
  }

  function handleDelete() {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => {
        message.success("Đã xoá announcement");
        setDeleteTarget(null);
      },
      onError: (err) => message.error(err.message),
    });
  }

  const columns: TableProps<Announcement>["columns"] = [
    { title: "Nội dung", dataIndex: "content", ellipsis: true },
    {
      title: "Mức độ",
      dataIndex: "level",
      render: (l: AnnouncementLevel) => (
        <Tag color={LEVEL_TAG[l] ?? LEVEL_TAG[(l ?? "").toString().toLowerCase() as AnnouncementLevel] ?? "default"}>
          {String(l ?? "")}
        </Tag>
      ),
    },
    {
      title: "Phạm vi",
      render: (_: unknown, record: Announcement) =>
        record.scopeType === "system" ? "Toàn hệ thống" : `${record.scopeType}: ${record.scopeId}`,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (s: string) => <Tag>{s}</Tag>,
    },
    {
      title: "Thao tác",
      render: (_: unknown, record: Announcement) => (
        <Space>
          <Can permissions={["admin.announcement.manage"]}>
            <Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(record); setModalOpen(true); }}>
              Sửa
            </Button>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => setDeleteTarget(record)}>
              Xoá
            </Button>
          </Can>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Announcements</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm nội dung"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => updateParams({ search: search || undefined, page: undefined })}
            style={{ width: 240 }}
          />
          <Select
            placeholder="Phạm vi"
            allowClear
            value={scopeType}
            options={SCOPE_OPTIONS}
            onChange={(value) => updateParams({ scopeType: value, page: undefined })}
            style={{ width: 160 }}
          />
          <Select
            placeholder="Trạng thái"
            allowClear
            value={status}
            options={[
              { label: "Active", value: "active" },
              { label: "Scheduled", value: "scheduled" },
              { label: "Expired", value: "expired" },
            ]}
            onChange={(value) => updateParams({ status: value, page: undefined })}
            style={{ width: 160 }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Làm mới</Button>
          <Can permissions={["admin.announcement.manage"]}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setModalOpen(true); }}>
              Tạo announcement
            </Button>
          </Can>
        </Space>
      </Card>

      {isError && (
        <Alert type="error" message="Không thể tải announcements" description={error?.message} style={{ marginBottom: 16 }} />
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

      <AnnouncementFormModal
        open={modalOpen}
        announcement={editing}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
        confirmLoading={create.isPending || update.isPending}
      />

      <Can permissions={["operations.announcement.manage"]}>
        <Modal
          open={!!deleteTarget}
          title="Xoá announcement"
          onOk={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          confirmLoading={remove.isPending}
          okText="Xoá"
          cancelText="Huỷ"
          okButtonProps={{ danger: true }}
        >
          <Typography.Text>
            Announcement sẽ bị xoá và không còn hiển thị với user. Tiếp tục?
          </Typography.Text>
        </Modal>
      </Can>
    </div>
  );
}
