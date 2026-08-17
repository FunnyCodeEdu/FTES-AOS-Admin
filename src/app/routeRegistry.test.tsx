import { describe, expect, it } from "vitest";

// jsdom không implement window.matchMedia, nhưng chain import routeRegistry → uiStore gọi nó
// ngay lúc import module. Polyfill TRƯỚC rồi mới dynamic-import registry (import tĩnh bị hoist
// lên trên polyfill nên không dùng được).
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

const { routeRegistry } = await import("./routeRegistry");

// Task 4.2 — BE change `admin-learning-pack-catalog`: route guard trang packs phải đòi đúng
// permission leaf BE seed `admin.pack.manage` (V162 seed catalog + identity.permissions,
// AdminLearningPackController.PERMISSION). Key cũ `package.manage` là leaf của commerce
// course-package, KHÔNG phải Learning Pack — dùng nhầm sẽ 403/ẩn nav sai người.

describe("route guard Learning Pack (/academic/packs)", () => {
  const packRoutes = routeRegistry.filter((r) => r.path.startsWith("/academic/packs"));

  it("có đủ 2 route list + detail", () => {
    expect(packRoutes.map((r) => r.path).sort()).toEqual([
      "/academic/packs",
      "/academic/packs/:id",
    ]);
  });

  it("cả 2 route đều guard bằng đúng leaf BE seed admin.pack.manage", () => {
    for (const route of packRoutes) {
      expect(route.requiredPermissions).toEqual(["admin.pack.manage"]);
    }
  });

  it("không route nào còn dùng key sai package.manage / pack.view / pack.manage", () => {
    const stale = routeRegistry.filter((r) =>
      (r.requiredPermissions ?? []).some((p) =>
        ["package.manage", "pack.view", "pack.manage"].includes(p)
      )
    );
    expect(stale.map((r) => r.path)).toEqual([]);
  });
});

/**
 * Khu GIẢNG VIÊN: khoá học gác leaf khoá học, lương gác leaf lương — không được trộn.
 *
 * Trước đây cả bốn route đều gác `payroll.read`, mượn tạm vì "LECTURER có leaf đó". Hai hậu quả đã
 * gặp thật: (1) môi trường chưa chạy V261 — nơi cấp payroll.read — thì giảng viên mất SẠCH, không
 * khoá học lẫn lương, không một dòng giải thích; (2) thu hồi quyền xem lương của một giảng viên là
 * họ mất luôn quyền sửa khoá, và không ai đoán ra mối liên hệ đó khi đi tìm nguyên nhân.
 *
 * Test này rẻ và cụ thể vì lỗi kia không làm gì đỏ: đổi một chuỗi leaf thì mọi test khác vẫn xanh,
 * chỉ có giảng viên ngoài đời là không vào được.
 */
describe("khu giảng viên gác đúng leaf", () => {
  const gateOf = (path: string) =>
    routeRegistry.find((r) => r.path === path)?.requiredPermissions ?? [];

  it("trang khoá học của tôi KHÔNG được phụ thuộc leaf lương", () => {
    for (const path of ["/instructor/courses", "/instructor/courses/:courseId"]) {
      expect(gateOf(path)).toContain("course.manage");
      expect(gateOf(path)).not.toContain("payroll.read");
    }
  });

  it("trang lương vẫn gác bằng leaf lương", () => {
    expect(gateOf("/instructor/earnings")).toEqual(["payroll.read"]);
  });

  it("rail gốc nhận HOẶC hai leaf — giảng viên theo nghĩa nào cũng thấy lối vào", () => {
    expect(gateOf("/instructor")).toEqual(
      expect.arrayContaining(["course.manage", "payroll.read"])
    );
  });
});
