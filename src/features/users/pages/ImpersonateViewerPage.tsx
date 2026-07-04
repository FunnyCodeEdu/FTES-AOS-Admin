import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Layout, Space, Typography } from "antd";
import { LogoutOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useImpersonationStore } from "../store/impersonationStore";

const { Header, Content } = Layout;

export default function ImpersonateViewerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { active, targetUser, token, expiresAt, exit } = useImpersonationStore();

  useEffect(() => {
    if (!active || !token) {
      navigate(`/users/${id}`);
      return;
    }
    const timeout = dayjs(expiresAt).diff(dayjs());
    if (timeout <= 0) {
      exit();
      navigate(`/users/${id}`);
      return;
    }
    const timer = setTimeout(() => {
      exit();
      navigate(`/users/${id}`);
    }, Math.min(timeout, 2147483647));
    return () => clearTimeout(timer);
  }, [active, token, expiresAt, id, navigate, exit]);

  if (!active || !targetUser) {
    return <Alert message="Không có phiên impersonate" type="warning" />;
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          background: "#fa8c16",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography.Text strong style={{ color: "#fff" }}>
          Đang xem dưới danh nghĩa {targetUser.fullName} ({targetUser.email}) — chế độ chỉ đọc
        </Typography.Text>
        <Space>
          <Typography.Text type="secondary" style={{ color: "rgba(255,255,255,0.85)" }}>
            Hết hạn: {dayjs(expiresAt).format("HH:mm:ss")}
          </Typography.Text>
          <Button
            icon={<LogoutOutlined />}
            onClick={() => {
              exit();
              navigate(`/users/${id}`);
            }}
          >
            Thoát
          </Button>
        </Space>
      </Header>
      <Content style={{ padding: 24 }}>
        <Alert
          message="Impersonation viewer"
          description={`Token read-only đã được cấp. Trong thực tế, iframe hoặc embedded app học viên sẽ render ở đây với token ${token!.slice(0, 8)}…`}
          type="info"
          showIcon
        />
      </Content>
    </Layout>
  );
}
