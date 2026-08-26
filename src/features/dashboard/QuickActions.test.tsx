import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderComponent } from "../../shared/testing/hookHarness";

const meMock = vi.hoisted(() => vi.fn());
const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("../auth/api", () => ({ useMe: meMock }));
vi.mock("react-router-dom", () => ({ useNavigate: () => navigateMock }));
vi.mock("../../shared/hooks/useIsMobile", () => ({ useIsMobile: () => true }));
// Hai modal con gọi API/antd nặng và không phải thứ đang kiểm ở đây.
vi.mock("./QuickCoursePickerModal", () => ({ QuickCoursePickerModal: () => null }));
// Panel "Khoá của tôi" gọi react-query; nó có test riêng, ở đây chỉ kiểm gate quyền của 3 lối tắt.
vi.mock("./MyCoursesQuickPanel", () => ({ MyCoursesQuickPanel: () => null }));
vi.mock("../academic/courses/components/GrantEnrollmentModal", () => ({
  GrantEnrollmentModal: () => null,
}));

import { QuickActions } from "./QuickActions";

function withPermissions(permissions: string[], superAdmin = false) {
  meMock.mockReturnValue({ data: { permissions, superAdmin, scopedGrants: [] } });
}

describe("QuickActions", () => {
  beforeEach(() => {
    navigateMock.mockClear();
  });

  it("chi hien loi tat ma nguoi dung co quyen", () => {
    withPermissions(["payroll.read"]);
    const { container, unmount } = renderComponent(<QuickActions />);

    const text = container.textContent ?? "";
    expect(text).toContain("Xem lương");
    expect(text).not.toContain("Thêm học viên");
    expect(text).not.toContain("Quản lí khoá học");
    unmount();
  });

  it("payroll.read di trang luong cua chinh minh, khong phai console tong", () => {
    withPermissions(["payroll.read"]);
    const { container, unmount } = renderComponent(<QuickActions />);

    const card = Array.from(container.querySelectorAll<HTMLElement>(".ant-card")).find((el) =>
      el.textContent?.includes("Xem lương")
    );
    card?.click();

    // Trỏ nhầm sang /payroll là vào rồi ăn 403: console tổng gác `payroll.manage`.
    expect(navigateMock).toHaveBeenCalledWith("/instructor/earnings");
    unmount();
  });

  it("payroll.manage di console luong tong", () => {
    withPermissions(["payroll.manage"]);
    const { container, unmount } = renderComponent(<QuickActions />);

    const card = Array.from(container.querySelectorAll<HTMLElement>(".ant-card")).find((el) =>
      el.textContent?.includes("Xem lương")
    );
    card?.click();

    expect(navigateMock).toHaveBeenCalledWith("/payroll");
    unmount();
  });

  it("super admin thay het du permissions rong", () => {
    // Bypass SUPER_ADMIN sống ở engine BE, không nằm trong `me.permissions` — quên cộng vào là
    // chính tài khoản super admin lại không thấy lối tắt nào.
    withPermissions([], true);
    const { container, unmount } = renderComponent(<QuickActions />);

    const text = container.textContent ?? "";
    expect(text).toContain("Thêm học viên");
    expect(text).toContain("Xem lương");
    expect(text).toContain("Quản lí khoá học");
    unmount();
  });

  it("khong co quyen nao thi an ca khoi", () => {
    withPermissions([]);
    const { container, unmount } = renderComponent(<QuickActions />);

    expect(container.textContent).toBe("");
    unmount();
  });
});
