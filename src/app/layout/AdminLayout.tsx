import { useMemo } from "react";
import {
  Layout,
  Button,
  Dropdown,
  Space,
  Typography,
  Modal,
  theme,
  Breadcrumb,
  Avatar,
  Skeleton,
} from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  SunOutlined,
  UserOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store";
import { useLogout, useMe } from "../../features/auth/api";
import { useUIStore } from "../../shared/stores/uiStore";
import { NavMenu } from "../../shared/permissions";
import { routeRegistry } from "../routeRegistry";
import { NotificationCenter } from "../../features/notifications/NotificationCenter";
import { useRunningTasks } from "../../features/notifications/api";

const { Header, Sider, Content } = Layout;

function useActiveRouteLabel(pathname: string) {
  return useMemo(() => {
    const match = routeRegistry.find((r) => r.path === pathname);
    return match?.nav?.label ?? pathname;
  }, [pathname]);
}

function useLogoutHandler() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: tasks } = useRunningTasks();
  const logout = useLogout();
  const clearSession = useAuthStore((s) => s.clearSession);

  return () => {
    const doLogout = () => {
      logout.mutate(undefined, {
        onSettled: () => {
          clearSession();
          queryClient.clear();
          navigate("/login");
        },
      });
    };

    const running = tasks?.items ?? [];
    if (running.length > 0) {
      Modal.confirm({
        title: "Có tác vụ đang chạy",
        content:
          "Một số tác vụ vẫn đang xử lý trên máy chủ. Bạn có thể đăng xuất, tác vụ sẽ tiếp tục chạy.",
        okText: "Vẫn đăng xuất",
        cancelText: "Ở lại",
        onOk: doLogout,
      });
    } else {
      doLogout();
    }
  };
}

export default function AdminLayout({ children }: { children?: React.ReactNode }) {
  const { token } = theme.useToken();
  const location = useLocation();
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const themeMode = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const { data: me, isLoading: meLoading } = useMe();
  const handleLogout = useLogoutHandler();
  const activeLabel = useActiveRouteLabel(location.pathname);

  const userMenuItems = useMemo(
    () => [
      {
        key: "profile",
        label: me?.user.fullName ?? "Tài khoản",
        icon: <UserOutlined />,
        disabled: true,
      },
      { type: "divider" as const },
      {
        key: "logout",
        label: "Đăng xuất",
        icon: <LogoutOutlined />,
        onClick: handleLogout,
      },
    ],
    [me, handleLogout]
  );

  const siderContent = (
    <>
      <div
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: sidebarCollapsed ? "center" : "flex-start",
          padding: sidebarCollapsed ? 0 : "0 16px",
          borderBottom: `1px solid ${token.colorBorderBg}`,
        }}
      >
        <Typography.Title
          level={5}
          style={{
            margin: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            display: sidebarCollapsed ? "none" : "block",
          }}
        >
          FTES AOS
        </Typography.Title>
        {sidebarCollapsed && <span style={{ fontWeight: 700 }}>F</span>}
      </div>
      <NavMenu registry={routeRegistry} collapsed={sidebarCollapsed} />
    </>
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        theme="light"
        collapsible
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
        breakpoint="md"
        collapsedWidth={80}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        {siderContent}
      </Sider>

      <Layout
        style={{
          marginLeft: sidebarCollapsed ? 80 : 200,
          transition: "margin-left 0.2s",
        }}
      >
        <Header
          style={{
            background: token.colorBgContainer,
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 50,
            boxShadow: token.boxShadowTertiary,
          }}
        >
          <Space>
            <Button
              type="text"
              icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
            <Breadcrumb
              items={[
                { title: <Link to="/">Trang chủ</Link> },
                { title: activeLabel },
              ]}
            />
          </Space>

          <Space>
            <Button
              type="text"
              icon={themeMode === "dark" ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggleTheme}
              aria-label={themeMode === "dark" ? "Chuyển sáng" : "Chuyển tối"}
            />
            <NotificationCenter />
            {meLoading ? (
              <Skeleton.Avatar active size="small" />
            ) : (
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Space style={{ cursor: "pointer" }}>
                  <Avatar src={me?.user.avatarUrl} icon={<UserOutlined />} size="small" />
                  <Typography.Text>{me?.user.fullName ?? "Admin"}</Typography.Text>
                </Space>
              </Dropdown>
            )}
          </Space>
        </Header>

        <Content style={{ padding: 24, overflow: "auto" }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
