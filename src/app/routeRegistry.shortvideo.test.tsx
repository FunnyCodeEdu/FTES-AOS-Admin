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

// change admin-shortvideo-studio.
//
// Vì sao khoá cái tên leaf lại bằng test: `/api/v1/admin/**` ở BE chỉ gác tới `authenticated()`,
// mọi kiểm quyền thật nằm trong controller theo ĐÚNG chuỗi `shortvideo.manage` mà migration seed.
// Gõ lệch một chữ ở đây thì nav biến mất với đúng người được giao việc, mà không có lỗi nào nổi lên.
describe("route Studio video ngắn (/content/shortvideo)", () => {
  const route = routeRegistry.find((r) => r.path === "/content/shortvideo");

  it("tồn tại, dùng layout admin và nằm trong nav nhóm Nội dung", () => {
    expect(route).toBeDefined();
    expect(route?.layout).toBe("admin");
    expect(route?.nav?.group).toBe("Nội dung");
    expect(route?.nav?.label).toBe("Studio video ngắn");
  });

  it("gác đúng MỘT leaf shortvideo.manage", () => {
    expect(route?.requiredPermissions).toEqual(["shortvideo.manage"]);
  });

  it("không đi kèm scope grant — quyền này là leaf GLOBAL, không scoped theo khoá", () => {
    expect(route?.requiredScope).toBeUndefined();
  });
});
