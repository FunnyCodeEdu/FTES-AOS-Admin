import { useState } from "react";
import { useParams } from "react-router-dom";
import { Alert, Button, Card, Descriptions, Skeleton, Space, Tag, Typography, message } from "antd";
import { CopyOutlined, MailOutlined, ReloadOutlined, RollbackOutlined } from "@ant-design/icons";
import { Can } from "../../../shared/permissions";
import { useInvite, useResendInvite, useRevokeInvite } from "../api/invites.api";
import { RevokeInviteModal } from "../components/RevokeInviteModal";

export default function InviteDetailPage() {
  const { inviteId } = useParams<{ inviteId: string }>();
  const { data: invite, isLoading, isError, error, refetch } = useInvite(inviteId);
  const revoke = useRevokeInvite();
  const resend = useResendInvite();
  const [revokeOpen, setRevokeOpen] = useState(false);

  if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (isError || !invite) {
    return (
      <Alert
        type="error"
        message="Không thể tải chi tiết invite"
        description={error?.message}
        action={<Button icon={<ReloadOutlined />} onClick={() => refetch()}>Thử lại</Button>}
      />
    );
  }

  function handleCopy() {
    navigator.clipboard.writeText(invite?.inviteUrl ?? "").then(() => message.success("Đã copy link"));
  }

  function handleRevoke(reason: string) {
    if (!invite) return;
    revoke.mutate(
      { id: invite.id, reason },
      {
        onSuccess: () => {
          message.success("Đã thu hồi invite");
          setRevokeOpen(false);
        },
        onError: (err) => message.error(err.message),
      }
    );
  }

  return (
    <div>
      <Typography.Title level={3}>Chi tiết invite</Typography.Title>
      <Card>
        <Descriptions bordered column={1}>
          <Descriptions.Item label="Email">{invite.email}</Descriptions.Item>
          <Descriptions.Item label="Scope">{invite.scopes.map((s) => `${s.scopeType}:${s.scopeName}`).join(", ")}</Descriptions.Item>
          <Descriptions.Item label="Quyền">{invite.permissions.join(", ")}</Descriptions.Item>
          <Descriptions.Item label="Hạn grant">{invite.grantExpiresAt}</Descriptions.Item>
          <Descriptions.Item label="Trạng thái"><Tag>{invite.status}</Tag></Descriptions.Item>
          <Descriptions.Item label="Invited by">{invite.invitedByName}</Descriptions.Item>
          <Descriptions.Item label="Ghi chú">{invite.note ?? "—"}</Descriptions.Item>
        </Descriptions>
        <Space style={{ marginTop: 16 }}>
          <Button icon={<CopyOutlined />} onClick={handleCopy}>Copy link</Button>
          {invite.status === "pending" && (
            <Can permissions={["grant.view"]}>
              <Button icon={<MailOutlined />} onClick={() => resend.mutate(invite.id)} loading={resend.isPending}>
                Gửi lại email
              </Button>
              <Button icon={<RollbackOutlined />} danger onClick={() => setRevokeOpen(true)}>
                Thu hồi
              </Button>
            </Can>
          )}
        </Space>
      </Card>

      <RevokeInviteModal
        open={revokeOpen}
        email={invite.email}
        onClose={() => setRevokeOpen(false)}
        onConfirm={handleRevoke}
        confirmLoading={revoke.isPending}
      />
    </div>
  );
}
