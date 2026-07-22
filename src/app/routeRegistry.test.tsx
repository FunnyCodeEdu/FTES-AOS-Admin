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
