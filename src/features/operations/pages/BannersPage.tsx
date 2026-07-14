import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, Button, Card, Input, Modal, Select, Space, Table, Tag, Typography, message } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { Can } from "../../../shared/permissions";
import { useBanners, useCreateBanner, useDeleteBanner, useUpdateBanner } from "../api/banners.api";
import { BannerFormModal } from "../components/BannerFormModal";
import { BannerPlacementPreview } from "../components/BannerPlacementPreview";
import type { Banner, BannerPlacement } from "../shared/types";
import type { TableProps } from "antd";

const PLACEMENT_OPTIONS: { label: string; value: BannerPlacement }[] = [
  { label: "Home Hero", value: "home-hero" },
  { label: "Sidebar", value: "sidebar" },
  { label: "Subject Top", value: "subject-top" },
];

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Expired", value: "expired" },
];

export default function BannersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);

  const position = (searchParams.get("position") as BannerPlacement) ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 10);

  const { data, isLoading, isError, error, refetch } = useBanners({
    position,
    status,
    search: searchParams.get("search") ?? undefined,
    page,
    pageSize,
  });
  const create = useCreateBanner();
  const update = useUpdateBanner();
  const remove = useDeleteBanner();

  function updateParams(next: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    });
    setSearchParams(params);
  }

  function handleSubmit(values: {
    title: string;
    imageUrl: string;
    linkUrl?: string;
    position: BannerPlacement;
    order: number;
    activeFrom?: string;
    activeTo?: string;
    subtitle?: string;
    ctaText?: string;
    theme?: string;
  }) {
    const onSuccess = () => {
      message.success(editing ? "Đã cập nhật banner" : "Đã tạo banner");
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
        message.success("Đã xoá banner");
        setDeleteTarget(null);
      },
      onError: (err) => message.error(err.message),
    });
  }

  const columns: TableProps<Banner>["columns"] = [
    { title: "Tiêu đề", dataIndex: "title" },
    { title: "Vị trí", dataIndex: "position" },
    { title: "Thứ tự", dataIndex: "order" },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (s: string) => <Tag>{s}</Tag>,
    },
    {
      title: "Preview",
      render: (_: unknown, record: Banner) => (
        <BannerPlacementPreview placement={record.position} imageUrl={record.imageUrl} />
      ),
    },
    {
      title: "Thao tác",
      render: (_: unknown, record: Banner) => (
        <Space>
          <Can permissions={["admin.banner.manage"]}>
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
      <Typography.Title level={3}>Banner Management</Typography.Title>
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
            placeholder="Vị trí"
            allowClear
            value={position}
            options={PLACEMENT_OPTIONS}
            onChange={(value) => updateParams({ position: value, page: undefined })}
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
          <Can permissions={["admin.banner.manage"]}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setModalOpen(true); }}>
              Tạo banner
            </Button>
          </Can>
        </Space>
      </Card>

      {isError && (
        <Alert type="error" message="Không thể tải banners" description={error?.message} style={{ marginBottom: 16 }} />
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

      <BannerFormModal
        open={modalOpen}
        banner={editing}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
        confirmLoading={create.isPending || update.isPending}
      />

      <Modal
        open={!!deleteTarget}
        title="Xoá banner"
          onOk={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          confirmLoading={remove.isPending}
          okText="Xoá"
          cancelText="Huỷ"
          okButtonProps={{ danger: true }}
        >
          <Typography.Text>
            Banner <strong>{deleteTarget?.title}</strong> sẽ biến mất khỏi vị trí <strong>{deleteTarget?.position}</strong> ngay lập tức. Tiếp tục?
          </Typography.Text>
      </Modal>
    </div>
  );
}
