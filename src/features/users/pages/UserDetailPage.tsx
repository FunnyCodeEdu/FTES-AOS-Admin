import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Avatar,
  Button,
  Card,
  Modal,
  Result,
  Skeleton,
  Space,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import {
  EyeOutlined,
  LockOutlined,
  UnlockOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { ApiError } from "../../../shared/api/client";
import { Can } from "../../../shared/permissions";
import { useImpersonate, useUser } from "../api/users.api";
import { useImpersonationStore } from "../store/impersonationStore";
import { ChangeRoleModal } from "../components/ChangeRoleModal";
import { LearningTab } from "../components/LearningTab";
import { LockUserModal } from "../components/LockUserModal";
import { ProfileTab } from "../components/ProfileTab";
import { ResetPasswordModal } from "../components/ResetPasswordModal";
import { RevokeSessionsModal } from "../components/RevokeSessionsModal";
import { SecurityLogTab } from "../components/SecurityLogTab";
import { SessionsTab } from "../components/SessionsTab";
import { TransactionsTab } from "../components/TransactionsTab";

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: user, isLoading, isError, error, refetch } = useUser(id);
  const impersonate = useImpersonate(id ?? "");
  const startImpersonation = useImpersonationStore((s) => s.start);

  const [lockOpen, setLockOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [changeRoleOpen, setChangeRoleOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);

  const handleImpersonate = () => {
    Modal.confirm({
      title: "Xác nhận impersonate",
      content:
        "Bạn sắp xem hệ thống dưới danh nghĩa user này. Phiên chỉ đọc, mọi thao tác ghi đều bị chặn và được ghi audit.",
      okText: "Bắt đầu xem",
      cancelText: "Huỷ",
      onOk: () => {
        impersonate.mutate(undefined, {
          onSuccess: (data) => {
            if (!user) return;
            startImpersonation(
              { id: user.id, fullName: user.fullName, email: user.email },
              data.token,
              data.expiresAt
            );
            navigate(`/users/${id}/impersonate`);
          },
          onError: (err: Error) => {
            const code = err instanceof ApiError ? err.code : undefined;
            if (code === 403) {
              message.error("Bạn không còn quyền impersonate");
            } else {
              message.error(err.message || "Không thể impersonate");
            }
          },
        });
      },
    });
  };

  if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (isError) {
    return (
      <Result
        status="error"
        title="Không thể tải thông tin user"
        subTitle={error?.message}
        extra={
          <Button onClick={() => refetch()} type="primary">
            Thử lại
          </Button>
        }
      />
    );
  }
  if (!user) {
    return (
      <Result
        status="404"
        title="Không tìm thấy user"
        extra={<Button onClick={() => navigate("/users")}>Về danh sách</Button>}
      />
    );
  }

  const isLocked = user.status === "locked";

  return (
    <div>
      <Card style={{ marginBottom: 24 }}>
        <Space align="start" size="large" style={{ width: "100%", justifyContent: "space-between" }}>
          <Space align="start" size="large">
            <Avatar size={64} src={user.avatarUrl}>
              {user.fullName.charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <Typography.Title level={3} style={{ margin: 0 }}>
                {user.fullName}
              </Typography.Title>
              <Typography.Text type="secondary">{user.email}</Typography.Text>
              <div style={{ marginTop: 8 }}>
                <Tag color={isLocked ? "red" : user.status === "pending" ? "orange" : "green"}>
                  {isLocked ? "Đã khoá" : user.status === "pending" ? "Chờ xác nhận" : "Đang hoạt động"}
                </Tag>
                {user.roles.map((r) => (
                  <Tag key={r.roleId}>{r.name}</Tag>
                ))}
              </div>
            </div>
          </Space>
          <Space wrap>
            <Can permissions={["user.lock"]}>
              <Button
                icon={isLocked ? <UnlockOutlined /> : <LockOutlined />}
                danger={!isLocked}
                onClick={() => setLockOpen(true)}
              >
                {isLocked ? "Mở khoá" : "Khoá tài khoản"}
              </Button>
            </Can>
            <Can permissions={["user.reset_password"]}>
              <Button icon={<KeyOutlined />} onClick={() => setResetOpen(true)}>
                Reset mật khẩu
              </Button>
            </Can>
            <Can permissions={["rbac.assignment.manage"]}>
              <Button icon={<SafetyCertificateOutlined />} onClick={() => setChangeRoleOpen(true)}>
                Đổi vai trò
              </Button>
            </Can>
            <Can permissions={["user.impersonate"]}>
              <Button icon={<EyeOutlined />} onClick={handleImpersonate} loading={impersonate.isPending}>
                Xem như user
              </Button>
            </Can>
          </Space>
        </Space>
      </Card>

      <Tabs
        items={[
          { key: "profile", label: "Hồ sơ", children: <ProfileTab profile={user} /> },
          { key: "learning", label: "Học tập", children: <LearningTab userId={user.id} /> },
          { key: "transactions", label: "Giao dịch", children: <TransactionsTab userId={user.id} /> },
          {
            key: "sessions",
            label: "Thiết bị & Session",
            children: (
              <SessionsTab
                userId={user.id}
                selected={selectedSessions}
                onSelectionChange={setSelectedSessions}
                onRevokeClick={() => setRevokeOpen(true)}
              />
            ),
          },
          { key: "security", label: "Security log", children: <SecurityLogTab userId={user.id} /> },
        ]}
      />

      <LockUserModal user={user} open={lockOpen} onClose={() => setLockOpen(false)} />
      <ResetPasswordModal userId={user.id} open={resetOpen} onClose={() => setResetOpen(false)} />
      <ChangeRoleModal user={user} open={changeRoleOpen} onClose={() => setChangeRoleOpen(false)} />
      <RevokeSessionsModal
        userId={user.id}
        open={revokeOpen}
        onClose={() => setRevokeOpen(false)}
        selectedSessionIds={selectedSessions}
        onSuccess={() => setSelectedSessions([])}
      />
    </div>
  );
}
