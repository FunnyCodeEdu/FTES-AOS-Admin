import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Card, Checkbox, List, Skeleton, Space, Typography, message } from "antd";
import { useMe, useLogout } from "../../auth/api";
import { useAcceptOnboarding, useOnboarding } from "../api/onboarding.api";
import { useRefreshCtvMe } from "../api/ctvMe.api";

export default function OnboardingPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { data: me, isLoading: meLoading } = useMe();
  const { data, isLoading, isError, error } = useOnboarding(token);
  const accept = useAcceptOnboarding();
  const logout = useLogout();
  const refreshMe = useRefreshCtvMe();

  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  if (meLoading) return <Skeleton active paragraph={{ rows: 6 }} />;
  if (!me) {
    const returnUrl = encodeURIComponent(`/ctv/onboarding/${token}`);
    window.location.href = `/login?returnUrl=${returnUrl}`;
    return null;
  }

  if (isLoading) return <Skeleton active paragraph={{ rows: 6 }} />;

  if (isError) {
    const errName = error?.name;
    if (errName === "InviteExpiredError") {
      return (
        <Alert
          type="error"
          message="Lời mời không còn hiệu lực"
          description="Link mời đã hết hạn hoặc bị thu hồi. Vui lòng liên hệ người mời."
          showIcon
        />
      );
    }
    if (errName === "WrongEmailError") {
      return (
        <Alert
          type="warning"
          message="Tài khoản không khớp"
          description="Lời mời được gửi cho email khác. Vui lòng đăng nhập đúng tài khoản."
          showIcon
          action={
            <Button onClick={() => logout.mutate()} loading={logout.isPending}>
              Đăng xuất & đổi tài khoản
            </Button>
          }
        />
      );
    }
    return <Alert type="error" message="Không thể tải invitation" description={error?.message} showIcon />;
  }

  const invite = data!.invite;
  const checklist = data!.checklist;
  const requiredKeys = checklist.filter((c) => c.required).map((c) => c.key);
  const allAcknowledged = requiredKeys.every((k) => acknowledged[k]);

  function handleToggle(key: string, checked: boolean) {
    setAcknowledged((prev) => ({ ...prev, [key]: checked }));
  }

  function handleAccept() {
    if (!allAcknowledged || !token) return;
    setSubmitting(true);
    const acknowledgedItems = checklist.filter((c) => acknowledged[c.key]).map((c) => c.key);
    accept.mutate(
      { token, acknowledgedItems },
      {
        onSuccess: () => {
          message.success("Chào mừng bạn trở thành CTV!");
          refreshMe();
          navigate("/ctv");
        },
        onError: (err) => {
          message.error(err.message);
          setSubmitting(false);
        },
      }
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <Typography.Title level={3}>Chào mừng CTV</Typography.Title>
      <Card title="Tóm tắt invitation" style={{ marginBottom: 16 }}>
        <Space direction="vertical">
          <Typography.Text>Email: <strong>{invite.email}</strong></Typography.Text>
          <Typography.Text>Scope: {invite.scopes.map((s) => `${s.scopeType}:${s.scopeName}`).join(", ")}</Typography.Text>
          <Typography.Text>Quyền: {invite.permissions.join(", ")}</Typography.Text>
          <Typography.Text>Hạn grant: {invite.grantExpiresAt}</Typography.Text>
          <Typography.Text>Invited by: {invite.invitedByName}</Typography.Text>
          {invite.note && <Typography.Text>Ghi chú: {invite.note}</Typography.Text>}
        </Space>
      </Card>

      <Card title="Checklist bắt buộc" style={{ marginBottom: 16 }}>
        <List
          dataSource={checklist}
          renderItem={(item) => (
            <List.Item>
              <Checkbox
                checked={!!acknowledged[item.key]}
                onChange={(e) => handleToggle(item.key, e.target.checked)}
              >
                {item.title} {item.required && <Typography.Text type="danger">*</Typography.Text>}
              </Checkbox>
              {item.content && <Typography.Paragraph type="secondary">{item.content}</Typography.Paragraph>}
            </List.Item>
          )}
        />
      </Card>

      <Button type="primary" size="large" disabled={!allAcknowledged} onClick={handleAccept} loading={submitting || accept.isPending}>
        Chấp nhận & bắt đầu
      </Button>
    </div>
  );
}
