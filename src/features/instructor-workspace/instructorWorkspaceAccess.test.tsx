import { describe, expect, it, vi } from "vitest";
import { renderHook } from "../../shared/testing/hookHarness";

/**
 * Khu giảng viên nhìn từ MỘT tài khoản LECTURER thật (không phải từ danh sách leaf mình mong nó có).
 *
 * Bộ leaf dưới đây đo trên apitest 2026-08-22 bằng token `instructor.test@ftes.vn`
 * (`GET /api/v1/identity/me/permissions` → 31 leaf). Điểm mấu chốt: **KHÔNG có `course.manage`** —
 * V27 đã thu hồi GLOBAL leaf đó khỏi LECTURER vì nó vượt qua mọi check scope COURSE ở BE. Cũng
 * **KHÔNG có scopedGrants COURSE nào**: quyền dạy của giảng viên nằm ở cột `instructor_id` của khoá,
 * không nằm trong bảng grant.
 */

window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia;

const LECTURER_PERMISSIONS = [
  "course.create",
  "course.content.edit",
  "course.publish",
  "course.grade",
  "challenge.manage",
  "challenge.grade",
  "challenge.participate",
  "payroll.read",
  "resource.upload",
  "subject.manage",
  "profile.update.self",
];

const { useMeMock } = vi.hoisted(() => ({ useMeMock: vi.fn() }));
vi.mock("../auth/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../auth/api")>();
  return { ...actual, useMe: useMeMock };
});

const { routeRegistry } = await import("../../app/routeRegistry");
const { useNavItems } = await import("../../shared/permissions/NavMenu");
const { hasAnyPermission } = await import("../../shared/permissions");
const { mergeCourses } = await import("./pages/InstructorHomePage");

function navKeys(items: ReturnType<typeof useNavItems>): string[] {
  return items.flatMap((i) => {
    const item = i as { key?: unknown; children?: Array<{ key?: unknown }> };
    return [String(item.key), ...(item.children ?? []).map((c) => String(c.key))];
  });
}

describe("LECTURER thật đi được hết khu giảng viên", () => {
  const permSet = new Set(LECTURER_PERMISSIONS);

  it("mọi route /instructor/* đều qua được cổng quyền", () => {
    const gated = routeRegistry.filter((r) => r.path.startsWith("/instructor"));
    expect(gated.length).toBeGreaterThanOrEqual(4);
    for (const route of gated) {
      expect(hasAnyPermission(permSet, route.requiredPermissions ?? [])).toBe(true);
    }
  });

  it("nav bày cả khoá học lẫn LƯƠNG cho giảng viên", () => {
    useMeMock.mockReturnValue({
      data: { permissions: LECTURER_PERMISSIONS, scopedGrants: [], superAdmin: false },
    });
    const { result, unmount } = renderHook(() => useNavItems(routeRegistry));
    const keys = navKeys(result.current);
    expect(keys).toContain("/instructor");
    expect(keys).toContain("/instructor/courses");
    expect(keys).toContain("/instructor/earnings");
    // Console payroll TỔNG vẫn ẩn: giảng viên chỉ có payroll.read (lương của mình), không payroll.manage.
    expect(keys).not.toContain("/payroll");
    unmount();
  });
});

describe("mergeCourses — nguồn khoá của trang tổng quan", () => {
  const owned = {
    id: "c1",
    title: "Lập trình C",
    slugName: "lap-trinh-c",
    courseCode: "PRF192",
    level: "BASIC",
    status: "PUBLISHED",
    saleMode: "PACKAGE",
    totalPrice: 0,
    salePrice: null,
    totalUser: 12,
    imageHeader: null,
    categoryId: null,
  };

  it("giảng viên owner THUẦN (0 scoped grant) vẫn thấy khoá của mình", () => {
    const rows = mergeCourses([], [owned]);
    expect(rows.map((r) => r.id)).toEqual(["c1"]);
    expect(rows[0].tags).toContain("Chủ khoá");
    // Không có hạn: ownership không hết hạn như grant.
    expect(rows[0].expiresAt).toBeUndefined();
  });

  it("khoá được GIAO qua COURSE-scope vẫn hiện kèm hạn", () => {
    const rows = mergeCourses(
      [{ scopeId: "c2", scopeName: "Khoá được giao", permissions: ["LECTURER"], expiresAt: "2026-12-31T00:00:00Z" }],
      []
    );
    expect(rows.map((r) => r.id)).toEqual(["c2"]);
    expect(rows[0].expiresAt).toBe("2026-12-31T00:00:00Z");
  });

  it("vừa sở hữu vừa được giao thì gộp làm MỘT dòng, không nhân đôi", () => {
    const rows = mergeCourses(
      [{ scopeId: "c1", scopeName: "c1", permissions: ["LECTURER"], expiresAt: "2026-12-31T00:00:00Z" }],
      [owned]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("Lập trình C");
    expect(rows[0].tags).toEqual(["Chủ khoá", "LECTURER"]);
  });
});
