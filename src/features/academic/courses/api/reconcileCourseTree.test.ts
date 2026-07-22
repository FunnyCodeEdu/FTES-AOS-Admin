import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { reconcileCourseTree } from "./courses.api";
import { coreClient } from "../../../../shared/api/client";
import type { CourseTreeNode } from "../../types";

// Task 4.2 — admin-lesson-exercise-authoring (admin-tree-assignment-node-removal):
// draft có node assignment (FE-only) → KHÔNG sync xuống BE, KHÔNG làm mất node khác.

vi.mock("../../../../shared/api/client", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../../shared/api/client")>();
  return {
    ...actual,
    coreClient: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const core = coreClient as unknown as {
  get: Mock;
  post: Mock;
  patch: Mock;
  delete: Mock;
};

beforeEach(() => {
  core.get.mockReset();
  core.post.mockReset().mockResolvedValue({ data: { id: "new-sec" } });
  core.patch.mockReset().mockResolvedValue({ data: null });
  core.delete.mockReset().mockResolvedValue({ data: null });
});

const draft: CourseTreeNode[] = [
  {
    id: "s1",
    key: "s1",
    title: "Chương 1 (đổi tên)",
    type: "section",
    children: [
      { id: "l1", key: "l1", title: "Bài 1", type: "lesson" },
      // Node assignment sót lại từ dữ liệu cũ — KHÔNG được persist.
      { key: "a1", title: "Bài tập sót", type: "assignment" },
      { key: "l-new", title: "Bài mới", type: "lesson", lessonType: "VIDEO" },
    ],
  },
];

const server: CourseTreeNode[] = [
  {
    id: "s1",
    key: "s1",
    title: "Chương 1",
    type: "section",
    children: [
      { id: "l1", key: "l1", title: "Bài 1", type: "lesson" },
      { id: "l2", key: "l2", title: "Bài bị xoá", type: "lesson" },
    ],
  },
  { id: "s2", key: "s2", title: "Chương bị xoá", type: "section", children: [] },
];

describe("reconcileCourseTree", () => {
  it("node assignment KHÔNG sinh request nào; node khác vẫn sync đủ", async () => {
    await reconcileCourseTree("course-1", draft, server);

    const allCalls = [
      ...core.post.mock.calls,
      ...core.patch.mock.calls,
      ...core.delete.mock.calls,
    ];
    // Không request nào chạm tới node assignment.
    expect(
      allCalls.some((call) => JSON.stringify(call).includes("Bài tập sót"))
    ).toBe(false);

    // Section giữ lại được PATCH đúng tên + sortOrder.
    expect(core.patch).toHaveBeenCalledWith("/courses/sections/s1", {
      name: "Chương 1 (đổi tên)",
      sortOrder: 0,
    });
    // Lesson cũ được PATCH.
    expect(core.patch).toHaveBeenCalledWith("/courses/lessons/l1", {
      name: "Bài 1",
      sortOrder: 0,
    });
    // Lesson mới được POST vào đúng section, sortOrder KHÔNG bị assignment chen giữa
    // tạo lỗ hổng (l1=0, "Bài mới"=1).
    expect(core.post).toHaveBeenCalledWith("/courses/sections/s1/lessons", {
      name: "Bài mới",
      type: "VIDEO",
      sortOrder: 1,
      free: false,
    });
  });

  it("chỉ xoá node server KHÔNG còn trong draft (l2, s2) — không đụng node giữ lại", async () => {
    await reconcileCourseTree("course-1", draft, server);

    expect(core.delete).toHaveBeenCalledTimes(2);
    expect(core.delete).toHaveBeenCalledWith("/courses/lessons/l2");
    expect(core.delete).toHaveBeenCalledWith("/courses/sections/s2");
  });

  it("section mới (chưa có id) → POST section trước, lesson con POST theo id BE trả", async () => {
    const draftNewSection: CourseTreeNode[] = [
      {
        key: "tmp-1",
        title: "Chương mới",
        type: "section",
        children: [{ key: "tmp-2", title: "Bài trong chương mới", type: "lesson" }],
      },
    ];
    await reconcileCourseTree("course-1", draftNewSection, []);

    expect(core.post).toHaveBeenCalledWith("/courses/course-1/sections", {
      name: "Chương mới",
      sortOrder: 0,
    });
    expect(core.post).toHaveBeenCalledWith("/courses/sections/new-sec/lessons", {
      name: "Bài trong chương mới",
      type: "DOCUMENT", // lessonType thiếu → mặc định DOCUMENT
      sortOrder: 0,
      free: false,
    });
  });
});
