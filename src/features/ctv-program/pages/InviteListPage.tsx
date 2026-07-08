import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, Badge, Button, Card, Input, Select, Space, Table, Tag, Typography, message } from "antd";
import { EyeOutlined, MailOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { Can } from "../../../shared/permissions";
import { useCreateInvite, useInvites, useResendInvite } from "../api/invites.api";
import { InviteFormModal } from "../components/InviteFormModal";
import type { CtvInvite } from "../shared/types";
import type { TableProps } from "antd";

const STATUS_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "Accepted", value: "accepted" },
  { label: "Expired", value: "expired" },
  { label: "Revoked", value: "revoked" },
];

export default function InviteListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [formOpen, setFormOpen] = useState(false);
  const status = searchParams.get("status") ?? undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 10);

  const { data, isLoading, isError, error, refetch } = useInvites({ status, search: searchParams.get("search") ?? undefined, page, pageSize });
  const create = useCreateInvite();
  const resend = useResendInvite();

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
      onSuccess: (invite) => {
        message.success("Đã tạo invite");
        setFormOpen(false);
        navigator.clipboard.writeText(invite.inviteUrl ?? "").catch(() => {});
      },
      onError: (err) => {
        const msg = err.message;
        if (msg.startsWith("DUPLICATE_PENDING:")) {
          const existingId = msg.split(":")[1];
          message.error(
            <span>
              Đã có invitation pending cho email này. <Link to={`/ctv-program/invites/${existingId}`}>Xem invite</Link>
            </span>
          );
        } else {
          message.error(err.message);
        }
      },
    });
  }

  const columns: TableProps<CtvInvite>["columns"] = [
    { title: "Email", dataIndex: "email" },
    {
      title: "Scope",
      render: (_: unknown, record: CtvInvite) => record.scopes.map((s) => `${s.scopeType}:${s.scopeName}`).join(", "),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (s: string) => (
        <Badge
          status={s === "pending" ? "processing" : s === "accepted" ? "success" : "default"}
          text={<Tag>{s}</Tag>}
        />
      ),
    },
    { title: "Invited by", dataIndex: "invitedByName" },
    {
      title: "Thao tác",
      render: (_: unknown, record: CtvInvite) => (
        <Space>
          <Link to={`/ctv-program/invites/${record.id}`}>
            <Button size="small" icon={<EyeOutlined />}>Chi tiết</Button>
          </Link>
          {record.status === "pending" && (
            <Can permissions={["grant.view"]}>
              <Button size="small" icon={<MailOutlined />} onClick={() => resend.mutate(record.id)} loading={resend.isPending}>
                Gửi lại
              </Button>
            </Can>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Invitations CTV</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm email"
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
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Làm mới</Button>
          <Can permissions={["grant.view"]}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
              Invite CTV
            </Button>
          </Can>
        </Space>
      </Card>

      {isError && <Alert type="error" message="Không thể tải invites" description={error?.message} style={{ marginBottom: 16 }} />}

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

      <InviteFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
        confirmLoading={create.isPending}
      />
    </div>
  );
}
