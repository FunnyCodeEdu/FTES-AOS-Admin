import { useState } from "react";
import { useParams } from "react-router-dom";
import { Alert, Button, Card, Descriptions, Skeleton, Space, Table, Tabs, Tag, Timeline, Typography, message } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Can } from "../../../shared/permissions";
import { useExpandGrants, useExtendGrants, useGrantHistory, useMember, useRevokeGrants } from "../api/members.api";
import { ExpandGrantsModal } from "../components/ExpandGrantsModal";
import { ExtendGrantsModal } from "../components/ExtendGrantsModal";
import { RevokeGrantsModal } from "../components/RevokeGrantsModal";
import type { CtvGrant, GrantHistoryEntry } from "../shared/types";
import type { TableProps } from "antd";

export default function MemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const { data, isLoading, isError, error, refetch } = useMember(memberId);
  const extend = useExtendGrants();
  const expand = useExpandGrants();
  const revoke = useRevokeGrants();
  const { data: history } = useGrantHistory(memberId);

  const [extendOpen, setExtendOpen] = useState(false);
  const [expandOpen, setExpandOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);

  if (isLoading) return <Skeleton active paragraph={{ rows: 10 }} />;
  if (isError || !data) {
    return (
      <Alert
        type="error"
        message="Không thể tải chi tiết member"
        description={error?.message}
        action={<Button icon={<ReloadOutlined />} onClick={() => refetch()}>Thử lại</Button>}
      />
    );
  }

  const { member, grants, kpi } = data;

  const grantColumns: TableProps<CtvGrant>["columns"] = [
    { title: "Scope", render: (_: unknown, g: CtvGrant) => `${g.scopeType}:${g.scopeName}` },
    { title: "Quyền", dataIndex: "permissions", render: (v: string[]) => v.join(", ") },
    {
      title: "Hết hạn",
      dataIndex: "expiresAt",
      render: (v: string) => {
        const days = dayjs(v).diff(dayjs(), "day");
        return days < 7 ? <Tag color="orange">{dayjs(v).format("DD/MM/YYYY")}</Tag> : dayjs(v).format("DD/MM/YYYY");
      },
    },
  ];

  function handleExtend(grantIds: string[], newExpiresAt: string, reason: string) {
    extend.mutate(
      { memberId: member.id, grantIds, newExpiresAt, reason },
      {
        onSuccess: () => {
          message.success("Đã gia hạn grant");
          setExtendOpen(false);
        },
        onError: (err) => message.error(err.message),
      }
    );
  }

  function handleExpand(scopes: { scopeType: string; scopeId: string; scopeName: string }[], permissions: string[], expiresAt: string, reason: string) {
    expand.mutate(
      { memberId: member.id, scopes, permissions, expiresAt, reason },
      {
        onSuccess: () => {
          message.success("Đã mở rộng quyền");
          setExpandOpen(false);
        },
        onError: (err) => message.error(err.message),
      }
    );
  }

  function handleRevoke(grantIds: string[], reason: string) {
    revoke.mutate(
      { memberId: member.id, grantIds, reason },
      {
        onSuccess: () => {
          message.success("Đã thu hồi grant");
          setRevokeOpen(false);
        },
        onError: (err) => {
          message.error(err.message);
          refetch();
        },
      }
    );
  }

  const items = [
    {
      key: "grants",
      label: "Grants",
      children: (
        <>
          <Can permissions={["grant.view"]}>
            <Space style={{ marginBottom: 16 }}>
              <Button onClick={() => setExtendOpen(true)}>Gia hạn</Button>
              <Button onClick={() => setExpandOpen(true)}>Mở rộng</Button>
              <Button danger onClick={() => setRevokeOpen(true)}>Thu hồi</Button>
            </Space>
          </Can>
          <Table rowKey="id" columns={grantColumns} dataSource={grants} pagination={false} />
        </>
      ),
    },
    {
      key: "kpi",
      label: "KPI",
      children: (
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Resources processed">{kpi.resourcesProcessed}</Descriptions.Item>
          <Descriptions.Item label="Posts moderated">{kpi.postsModerated}</Descriptions.Item>
        </Descriptions>
      ),
    },
    {
      key: "history",
      label: "Lịch sử",
      children: (
        <Timeline
          items={(history?.items ?? []).map((h: GrantHistoryEntry) => ({
            children: (
              <div>
                <Typography.Text strong>{h.action}</Typography.Text> — {h.actorName}
                <div>{h.detail}</div>
                {h.reason && <div>Lý do: {h.reason}</div>}
                <div>{dayjs(h.at).format("DD/MM/YYYY HH:mm")}</div>
              </div>
            ),
          }))}
        />
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>{member.fullName}</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={2}>
          <Descriptions.Item label="Email">{member.email}</Descriptions.Item>
          <Descriptions.Item label="Active grants">{member.activeGrantCount}</Descriptions.Item>
        </Descriptions>
      </Card>
      <Tabs items={items} />

      <ExtendGrantsModal
        open={extendOpen}
        grants={grants}
        onClose={() => setExtendOpen(false)}
        onConfirm={handleExtend}
        confirmLoading={extend.isPending}
      />

      <ExpandGrantsModal
        open={expandOpen}
        onClose={() => setExpandOpen(false)}
        onConfirm={handleExpand}
        confirmLoading={expand.isPending}
      />

      <RevokeGrantsModal
        open={revokeOpen}
        grants={grants}
        onClose={() => setRevokeOpen(false)}
        onConfirm={handleRevoke}
        confirmLoading={revoke.isPending}
      />
    </div>
  );
}
