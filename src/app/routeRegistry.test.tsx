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
 * Khu GIẢNG VIÊN: mỗi trang phải gác bằng leaf mà role LECTURER THẬT SỰ có.
 *
 * Hai lần hỏng đã trả giá ở đúng chỗ này:
 *  1. Cả bốn route gác `payroll.read` — mượn tạm vì "LECTURER có leaf đó" ⇒ quyền xem LƯƠNG quyết
 *     định việc giảng viên có sửa được KHOÁ hay không, và môi trường chưa chạy V261 thì họ mất sạch.
 *  2. Sửa lần đó đổi sang `course.manage` kèm chú thích "LECTURER có từ V14" — nhưng **V27 đã thu hồi
 *     `course.manage` GLOBAL khỏi LECTURER** (lỗ hổng BOLA cross-instructor). Kết quả: MỌI giảng viên
 *     bấm vào khoá của mình đều rơi /403, suốt cho tới khi có người báo "khoá tôi dạy không sửa được".
 *
 * Nên test không so với một chuỗi cứng nữa mà so với BỘ LEAF THẬT của LECTURER: gate nào không giao
 * với bộ này thì giảng viên không vào được, dù chuỗi trông có vẻ đúng nghĩa.
 */
describe("khu giảng viên gác đúng leaf", () => {
  // Đo trực tiếp trên apitest 2026-08-22: GET /api/v1/identity/me/permissions bằng token LECTURER
  // (instructor.test@ftes.vn) — 31 leaf. Chỉ liệt kê phần liên quan tới khu này; nguồn ở BE là
  // V4/V14/V27 (thu hồi course.manage) + V261 (payroll.read) + V330 (challenge.manage).
  const LECTURER_LEAVES = new Set([
    "course.create",
    "course.content.edit",
    "course.publish",
    "course.grade",
    "challenge.manage",
    "challenge.grade",
    "payroll.read",
    "resource.upload",
    "subject.manage",
  ]);

  const gateOf = (path: string) =>
    routeRegistry.find((r) => r.path === path)?.requiredPermissions ?? [];

  const instructorPaths = [
    "/instructor",
    "/instructor/courses",
    "/instructor/courses/:courseId",
    "/instructor/earnings",
  ];

  it("mọi route trong khu đều mở được cho một LECTURER thật", () => {
    for (const path of instructorPaths) {
      const gate = gateOf(path);
      expect(gate.length).toBeGreaterThan(0);
      expect(gate.some((leaf) => LECTURER_LEAVES.has(leaf))).toBe(true);
    }
  });

  it("KHÔNG route nào của khu chỉ gác bằng course.manage (V27 đã thu hồi khỏi LECTURER)", () => {
    for (const path of instructorPaths) {
      expect(gateOf(path)).not.toEqual(["course.manage"]);
    }
  });

  it("trang khoá học của tôi KHÔNG được phụ thuộc leaf lương", () => {
    for (const path of ["/instructor/courses", "/instructor/courses/:courseId"]) {
      expect(gateOf(path)).toContain("course.content.edit");
      expect(gateOf(path)).not.toContain("payroll.read");
    }
  });

  it("trang lương vẫn gác bằng leaf lương", () => {
    expect(gateOf("/instructor/earnings")).toEqual(["payroll.read"]);
  });

  it("admin học thuật (course.manage) vẫn vào được khu khoá học", () => {
    for (const path of ["/instructor/courses", "/instructor/courses/:courseId"]) {
      expect(gateOf(path)).toContain("course.manage");
    }
  });

  it("khoá học VÀ lương đều có nav riêng — không chỉ đi vòng qua trang tổng quan", () => {
    const navOf = (path: string) => routeRegistry.find((r) => r.path === path)?.nav;
    // Lối vào duy nhất tới lương trước đây là một thẻ trong /instructor, mà trang đó lại tự chặn
    // chính giảng viên owner ⇒ "chưa thấy lương". Nav riêng làm lối đi không phụ thuộc trang khác.
    expect(navOf("/instructor/courses")?.group).toBe("Giảng viên");
    expect(navOf("/instructor/earnings")?.group).toBe("Giảng viên");
    expect(navOf("/instructor")?.group).toBe("Giảng viên");
  });
});
