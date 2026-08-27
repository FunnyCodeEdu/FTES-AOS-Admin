import { useMemo, useState } from "react";
import {
  Layout,
  Button,
  Drawer,
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
  MenuOutlined,
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
import { useIsMobile } from "../../shared/hooks/useIsMobile";
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
  // Điện thoại: KHÔNG giữ sider cố định (nó ăn mất 80px bề ngang vốn đã hẹp) — menu vào Drawer, mở
  // bằng chính nút hamburger đang có, và tự đóng sau khi chọn mục.
  const isMobile = useIsMobile();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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

  // Nhận `collapsed` qua tham số chứ KHÔNG đọc thẳng `sidebarCollapsed`: Drawer trên điện thoại
  // rộng 260px nên luôn phải hiện menu đầy đủ. Dùng chung một cờ với Sider thì menu trong Drawer
  // thừa hưởng trạng thái thu gọn (Sider có breakpoint="md" nên ở màn nhỏ cờ này đang bật) — antd
  // Menu ở chế độ thu gọn chỉ vẽ CHỮ CÁI ĐẦU của mỗi mục, đúng như đã thấy trên production.
  const renderNav = (collapsed: boolean, onItemClick?: () => void) => (
    // Full-height flex column: fixed logo header + a SCROLLABLE nav region. Without the
    // scroll wrapper, a nav list taller than the viewport overflows the fixed Sider and its
    // bottom items become unreachable. paddingBottom clears the collapse trigger bar (48px).
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          height: 64,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          padding: collapsed ? 0 : "0 16px",
          borderBottom: `1px solid ${token.colorBorderBg}`,
        }}
      >
        <Typography.Title
          level={5}
          style={{
            margin: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            display: collapsed ? "none" : "block",
          }}
        >
          FTES AOS
        </Typography.Title>
        {collapsed && <span style={{ fontWeight: 700 }}>F</span>}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", paddingBottom: 48 }}>
        <NavMenu registry={routeRegistry} collapsed={collapsed} onItemClick={onItemClick} />
      </div>
    </div>
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {isMobile ? (
        <Drawer
          placement="left"
          width={260}
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          styles={{ body: { padding: 0 } }}
        >
          {/* Đóng khi CHỌN XONG một mục, không phải khi chạm bất kỳ đâu: trước đây `onClick` gắn ở
              cả Drawer nên chạm vào mũi tên sổ nhóm là đóng luôn, chưa kịp chọn. */}
          {renderNav(false, () => setMobileNavOpen(false))}
        </Drawer>
      ) : (
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
          {renderNav(sidebarCollapsed)}
        </Sider>
      )}

      <Layout
        style={{
          marginLeft: isMobile ? 0 : sidebarCollapsed ? 80 : 200,
          transition: "margin-left 0.2s",
        }}
      >
        <Header
          style={{
            background: token.colorBgContainer,
            padding: isMobile ? "0 12px" : "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 50,
            boxShadow: token.boxShadowTertiary,
          }}
        >
          {/* Flex + alignItems:center tường minh thay cho Space: nút header cao 44px (rule vùng chạm
              trên điện thoại) còn nhãn là span inline, nên căn theo baseline làm chữ tụt xuống. */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <Button
              type="text"
              // Điện thoại: dấu 3 gạch thuần. Mũi tên gập/mở của desktop nói về một cái sider mà
              // trên điện thoại vốn không tồn tại — ở đây menu nằm sau Drawer, bấm mới bung ra.
              icon={
                isMobile ? (
                  <MenuOutlined />
                ) : sidebarCollapsed ? (
                  <MenuUnfoldOutlined />
                ) : (
                  <MenuFoldOutlined />
                )
              }
              onClick={() =>
                isMobile ? setMobileNavOpen(true) : setSidebarCollapsed(!sidebarCollapsed)
              }
              aria-label="Mở menu"
            />
            {/* Breadcrumb chiếm gần hết bề ngang điện thoại mà chỉ lặp lại tên trang → mobile chỉ
                hiện tên trang. */}
            {isMobile ? (
              <Typography.Text
                strong
                ellipsis
                style={{ maxWidth: "45vw", lineHeight: 1, display: "block" }}
              >
                {activeLabel}
              </Typography.Text>
            ) : (
              <Breadcrumb
                items={[
                  { title: <Link to="/">Trang chủ</Link> },
                  { title: activeLabel },
                ]}
              />
            )}
          </div>

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

        <Content style={{ padding: isMobile ? 12 : 24, overflow: "auto" }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
