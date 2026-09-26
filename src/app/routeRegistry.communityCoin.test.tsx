import { describe, expect, it } from "vitest";

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

describe("màn cộng Fcoin trong Cộng đồng", () => {
  const route = routeRegistry.find((item) => item.path === "/community/fcoin");

  it("có lối vào riêng trong nhóm Cộng đồng", () => {
    expect(route?.nav?.group).toBe("Cộng đồng");
    expect(route?.nav?.label).toBe("Cộng Fcoin");
  });

  it("chỉ hiện cho tài khoản có quyền điều chỉnh ví", () => {
    expect(route?.requiredPermissions).toEqual(["wallet.adjust"]);
  });
});
