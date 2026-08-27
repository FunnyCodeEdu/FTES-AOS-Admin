import { describe, expect, it, vi } from "vitest";
import { act } from "react";
import { renderComponent } from "../../shared/testing/hookHarness";

// `import` cua ESM bi hoist len tren moi cau lenh thuong, ma uiStore goi matchMedia NGAY LUC
// import (getSystemTheme). Stub phai nam trong vi.hoisted moi chay kip truoc do.
vi.hoisted(() => {
  if (typeof window.matchMedia !== "function") {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
});

const isMobileMock = vi.hoisted(() => vi.fn(() => true));
const navCollapsedCalls = vi.hoisted(() => [] as boolean[]);

vi.mock("../../shared/hooks/useIsMobile", () => ({ useIsMobile: isMobileMock }));
// Chi thay NavMenu; cac export khac (ForbiddenPage, Can...) van la ban that vi module khac dung.
vi.mock("../../shared/permissions", async (importActual) => ({
  ...(await importActual<Record<string, unknown>>()),
  NavMenu: ({ collapsed, onItemClick }: { collapsed: boolean; onItemClick?: () => void }) => {
    navCollapsedCalls.push(collapsed);
    return (
      <div data-testid="nav">
        {collapsed ? "THU-GON" : "DAY-DU"}
        {/* Giả lập hai kiểu chạm trong menu: mở nhóm (antd KHÔNG bắn onClick) và chọn mục lá. */}
        <button data-testid="group" onClick={() => {}}>
          Mo nhom
        </button>
        <button data-testid="leaf" onClick={() => onItemClick?.()}>
          Chon muc
        </button>
      </div>
    );
  },
}));
vi.mock("../../features/auth/api", () => ({
  useMe: () => ({ data: { user: { fullName: "Hai" }, permissions: [] }, isLoading: false }),
  useLogout: () => ({ mutate: vi.fn() }),
}));
vi.mock("../../features/notifications/api", () => ({
  useRunningTasks: () => ({ data: { items: [] } }),
}));
vi.mock("../../features/notifications/NotificationCenter", () => ({
  NotificationCenter: () => null,
}));
// Giu nguyen phan con lai cua react-query: module khac (vd features/ai/api) dung useQuery that.
vi.mock("@tanstack/react-query", async (importActual) => ({
  ...(await importActual<Record<string, unknown>>()),
  useQueryClient: () => ({ clear: vi.fn() }),
}));
vi.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: "/" }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

import AdminLayout from "./AdminLayout";
import { useUIStore } from "../../shared/stores/uiStore";

describe("AdminLayout — menu trên điện thoại", () => {
  it("Drawer luôn hiện menu ĐẦY ĐỦ dù sider đang ở trạng thái thu gọn", () => {
    // Đây chính là lỗi đã lọt ra production: Drawer dùng chung cờ `sidebarCollapsed` với Sider, mà
    // Sider có breakpoint="md" nên ở màn nhỏ cờ đó bật → antd Menu chỉ vẽ CHỮ CÁI ĐẦU của mỗi mục.
    act(() => {
      useUIStore.getState().setSidebarCollapsed(true);
    });
    navCollapsedCalls.length = 0;

    const { container, unmount } = renderComponent(<AdminLayout />);

    const hamburger = container.querySelector<HTMLElement>('[aria-label="Mở menu"]');
    expect(hamburger).not.toBeNull();
    act(() => {
      hamburger!.click();
    });

    expect(navCollapsedCalls.length).toBeGreaterThan(0);
    expect(navCollapsedCalls.every((collapsed) => collapsed === false)).toBe(true);
    expect(document.body.textContent).toContain("DAY-DU");
    expect(document.body.textContent).not.toContain("THU-GON");
    unmount();
  });

  it("laptop: Sider vẫn tôn trọng trạng thái thu gọn người dùng chọn", () => {
    isMobileMock.mockReturnValue(false);
    act(() => {
      useUIStore.getState().setSidebarCollapsed(true);
    });
    navCollapsedCalls.length = 0;

    const { unmount } = renderComponent(<AdminLayout />);

    expect(navCollapsedCalls).toContain(true);
    unmount();
    isMobileMock.mockReturnValue(true);
  });

  it("chạm mở NHÓM không được đóng Drawer, chọn MỤC mới đóng", () => {
    isMobileMock.mockReturnValue(true);
    const { container, unmount } = renderComponent(<AdminLayout />);

    act(() => {
      container.querySelector<HTMLElement>('[aria-label="Mở menu"]')!.click();
    });
    expect(document.querySelector(".ant-drawer")).not.toBeNull();

    // Trước đây `onClick` gắn ở cả Drawer nên cú chạm này đóng luôn, chưa kịp chọn gì.
    act(() => {
      document.querySelector<HTMLElement>('[data-testid="group"]')!.click();
    });
    expect(document.querySelector(".ant-drawer-open")).not.toBeNull();

    act(() => {
      document.querySelector<HTMLElement>('[data-testid="leaf"]')!.click();
    });
    expect(document.querySelector(".ant-drawer-open")).toBeNull();
    unmount();
  });
});
