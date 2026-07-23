import { describe, expect, it } from "vitest";
import { hasAnyPermission } from "../shared/permissions";

// jsdom không implement window.matchMedia, nhưng chain import routeRegistry → uiStore gọi nó
// ngay lúc import module. Polyfill TRƯỚC rồi mới dynamic-import registry (import tĩnh bị hoist
// lên trên polyfill nên không dùng được). Cùng kỹ thuật với routeRegistry.test.tsx.
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

// Change `admin-lecturer-ai-assist`: cụm trợ giảng AI (mentor console + sinh đề + phân tích
// độ khó + soạn lesson AI) là UI của GIẢNG VIÊN. BE gác các endpoint tương ứng bằng leaf
// `ai.teacher.use` (V134 seed; MentorController, JobController exam-generate/difficulty,
// AiFeature.LESSON_SUGGESTION). Route guard PHẢI mở cho giảng viên qua `ai.teacher.use`,
// KHÔNG được khoá riêng sau leaf admin (admin.subject.read / admin.course.read) — nếu không
// giảng viên (chỉ có ai.teacher.use) bị 403 dù BE cho phép.

const AI_TEACHER = "ai.teacher.use";

// Các route host tính năng trợ giảng AI cho chính giảng viên.
const MENTOR_CONSOLE = "/academic/ai-assist"; // MentorConsolePage (student-brief/feedback/cohort)
const QUIZ_BANK = "/academic/quiz-bank"; // AiExamGenerateModal + AiDifficultyDrawer
const LESSON_EDIT = "/academic/courses/:courseId/lessons/:lessonId"; // LessonAiDraftPanel

function routeFor(path: string) {
  const route = routeRegistry.find((r) => r.path === path);
  if (!route) throw new Error(`route not found: ${path}`);
  return route;
}

describe("route guard trợ giảng AI (change admin-lecturer-ai-assist)", () => {
  it("cả 3 route AI-assist đều cho phép leaf giảng viên ai.teacher.use", () => {
    for (const path of [MENTOR_CONSOLE, QUIZ_BANK, LESSON_EDIT]) {
      expect(routeFor(path).requiredPermissions).toContain(AI_TEACHER);
    }
  });

  it("mentor console gác ĐÚNG ai.teacher.use (surface thuần của giảng viên)", () => {
    expect(routeFor(MENTOR_CONSOLE).requiredPermissions).toEqual([AI_TEACHER]);
  });

  it("quiz bank giữ admin.subject.read (list toàn hệ) NHƯNG OR thêm ai.teacher.use", () => {
    const perms = routeFor(QUIZ_BANK).requiredPermissions ?? [];
    expect(perms).toContain("admin.subject.read");
    expect(perms).toContain(AI_TEACHER);
  });

  it("soạn bài học giữ admin.course.read NHƯNG OR thêm ai.teacher.use", () => {
    const perms = routeFor(LESSON_EDIT).requiredPermissions ?? [];
    expect(perms).toContain("admin.course.read");
    expect(perms).toContain(AI_TEACHER);
  });

  it("KHÔNG route AI-assist nào còn khoá riêng sau leaf admin mà thiếu ai.teacher.use", () => {
    for (const path of [MENTOR_CONSOLE, QUIZ_BANK, LESSON_EDIT]) {
      const perms = routeFor(path).requiredPermissions ?? [];
      const adminOnly =
        (perms.includes("admin.subject.read") || perms.includes("admin.course.read")) &&
        !perms.includes(AI_TEACHER);
      expect(adminOnly).toBe(false);
    }
  });
});

describe("guard hiện/ẩn route theo phiên (mirror PermissionRoute.hasAnyPermission)", () => {
  // Giảng viên chỉ có leaf AI, KHÔNG có leaf admin.
  const lecturer = new Set([AI_TEACHER]);
  // Học viên/không quyền: không có leaf nào liên quan.
  const outsider = new Set(["user.view"]);

  it("giảng viên (ai.teacher.use) VÀO được cả 3 route AI-assist", () => {
    for (const path of [MENTOR_CONSOLE, QUIZ_BANK, LESSON_EDIT]) {
      const required = routeFor(path).requiredPermissions ?? [];
      expect(hasAnyPermission(lecturer, required)).toBe(true);
    }
  });

  it("người không có ai.teacher.use bị CHẶN khỏi mentor console (surface thuần)", () => {
    const required = routeFor(MENTOR_CONSOLE).requiredPermissions ?? [];
    expect(hasAnyPermission(outsider, required)).toBe(false);
  });

  it("admin (chỉ leaf admin) vẫn VÀO được quiz bank + soạn bài (không bị OR làm mất quyền)", () => {
    const admin = new Set(["admin.subject.read", "admin.course.read"]);
    expect(hasAnyPermission(admin, routeFor(QUIZ_BANK).requiredPermissions ?? [])).toBe(true);
    expect(hasAnyPermission(admin, routeFor(LESSON_EDIT).requiredPermissions ?? [])).toBe(true);
  });
});
