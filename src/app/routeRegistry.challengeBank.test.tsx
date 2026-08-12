import { describe, expect, it } from "vitest";

// jsdom không implement window.matchMedia, nhưng chain import routeRegistry → uiStore gọi nó ngay
// lúc import. Polyfill TRƯỚC rồi mới dynamic-import registry (import tĩnh bị hoist lên trên).
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

// change admin-challenge-bank-console.
describe("route Kho thử thách (/academic/challenge-bank)", () => {
  const route = routeRegistry.find((r) => r.path === "/academic/challenge-bank");

  it("tồn tại và nằm trong nav nhóm Học thuật", () => {
    expect(route).toBeDefined();
    expect(route?.nav?.group).toBe("Học thuật");
    expect(route?.layout).toBe("admin");
  });

  it("gate OR phủ đúng ba leaf mà BE coi là phạm vi kho GLOBAL", () => {
    for (const leaf of ["admin.challenge.read", "admin.challenge.manage", "admin.course.manage"]) {
      expect(route?.requiredPermissions).toContain(leaf);
    }
  });
});

describe("route Duyệt thử thách (/academic/challenge-review)", () => {
  const route = routeRegistry.find((r) => r.path === "/academic/challenge-review");

  it("tồn tại và nằm trong nav nhóm Học thuật", () => {
    expect(route).toBeDefined();
    expect(route?.nav?.group).toBe("Học thuật");
  });

  // Đây là bài học đắt: quyền duyệt của CTV là grant SCOPED theo môn, không nằm trong danh sách
  // leaf global `me.permissions`. Gate route bằng leaf sẽ đá đúng người được giao việc sang /403,
  // trong khi endpoint đã tự lọc phạm vi và trả trang RỖNG (không 403). Test này khoá quyết định đó
  // lại để không ai "sửa cho chặt hơn" rồi tái lập lỗi cũ.
  it("KHÔNG gate bằng permission/scope ở client — server đã scope sẵn", () => {
    expect(route?.requiredPermissions).toBeUndefined();
    expect(route?.requiredScope).toBeUndefined();
  });
});
