import { describe, expect, it, vi } from "vitest";
import { renderHook } from "../testing/hookHarness";

// Nợ quality-loop admin-gamification-console 5.2 (phần unit): acc thiếu quyền
// gamification.admin.manage KHÔNG thấy group nav "Gamification"; acc có quyền thấy đủ 4 trang.
// jsdom không có matchMedia nhưng chain import routeRegistry → uiStore gọi nó lúc import —
// polyfill TRƯỚC rồi mới dynamic-import (giống routeRegistry.test.tsx).

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

// NavMenu lấy permission qua useMe — mock riêng hook này, giữ nguyên phần còn lại của module.
const { useMeMock } = vi.hoisted(() => ({ useMeMock: vi.fn() }));
vi.mock("../../features/auth/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../features/auth/api")>();
  return { ...actual, useMe: useMeMock };
});

const { routeRegistry } = await import("../../app/routeRegistry");
const { useNavItems } = await import("./NavMenu");

function meWith(permissions: string[]) {
  return { data: { permissions, scopedGrants: [] } };
}

function navKeys(items: ReturnType<typeof useNavItems>): string[] {
  return items.map((i) => String(i?.key));
}

describe("route guard Gamification (/gamification/*)", () => {
  const gamiRoutes = routeRegistry.filter((r) => r.path.startsWith("/gamification/"));

  it("đủ 4 route quests / xp-rules / reward-pools / seasons trong group Gamification", () => {
    expect(gamiRoutes.map((r) => r.path).sort()).toEqual([
      "/gamification/quests",
      "/gamification/reward-pools",
      "/gamification/seasons",
      "/gamification/xp-rules",
    ]);
    for (const r of gamiRoutes) {
      expect(r.nav?.group).toBe("Gamification");
    }
  });

  it("cả 4 route đều guard bằng đúng leaf gamification.admin.manage", () => {
    for (const r of gamiRoutes) {
      expect(r.requiredPermissions).toEqual(["gamification.admin.manage"]);
    }
  });
});

describe("useNavItems — gate permission ẩn menu Gamification", () => {
  it("acc thiếu quyền → group Gamification KHÔNG xuất hiện trong nav", () => {
    useMeMock.mockReturnValue(meWith(["admin.analytics.read", "course.manage"]));
    const h = renderHook(() => useNavItems(routeRegistry));
    const keys = navKeys(h.result.current);
    expect(keys).not.toContain("group-Gamification");
    expect(keys.some((k) => k.startsWith("/gamification/"))).toBe(false);
    h.unmount();
  });

  it("acc có gamification.admin.manage → group Gamification hiện đủ 4 trang", () => {
    useMeMock.mockReturnValue(meWith(["gamification.admin.manage"]));
    const h = renderHook(() => useNavItems(routeRegistry));
    const group = h.result.current.find((i) => i?.key === "group-Gamification") as
      | { children?: { key: string }[] }
      | undefined;
    expect(group).toBeDefined();
    expect((group?.children ?? []).map((c) => String(c.key)).sort()).toEqual([
      "/gamification/quests",
      "/gamification/reward-pools",
      "/gamification/seasons",
      "/gamification/xp-rules",
    ]);
    h.unmount();
  });
});
