import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { reconcileCourseTree } from "./courses.api";
import { coreClient } from "../../../../shared/api/client";
import type { CourseTreeNode } from "../../types";

// F2 — reconcileCourseTree DIFF draft ↔ server, chỉ ghi phần thay đổi + dùng endpoint reorder cho
// thứ tự (POST /courses/{id}/sections/reorder, PUT /courses/{id}/lessons/reorder) thay cho PATCH
// sortOrder từng node. Cũng giữ: node assignment (FE-only) KHÔNG persist, xoá node bỏ khỏi draft.

vi.mock("../../../../shared/api/client", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../../shared/api/client")>();
  return {
    ...actual,
    coreClient: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const core = coreClient as unknown as {
  get: Mock;
  post: Mock;
  put: Mock;
  patch: Mock;
  delete: Mock;
};

beforeEach(() => {
  core.get.mockReset();
  core.post.mockReset().mockResolvedValue({ data: { id: "new-sec" } });
  core.put.mockReset().mockResolvedValue({ data: null });
  core.patch.mockReset().mockResolvedValue({ data: null });
  core.delete.mockReset().mockResolvedValue({ data: null });
});

function writeCount(): number {
  return (
    core.post.mock.calls.length +
    core.put.mock.calls.length +
    core.patch.mock.calls.length +
    core.delete.mock.calls.length
  );
}

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
  it("node assignment KHÔNG sinh request nào; đổi tên section PATCH name-only", async () => {
    await reconcileCourseTree("course-1", draft, server);

    const allCalls = [
      ...core.post.mock.calls,
      ...core.put.mock.calls,
      ...core.patch.mock.calls,
      ...core.delete.mock.calls,
    ];
    // Không request nào chạm tới node assignment.
    expect(
      allCalls.some((call) => JSON.stringify(call).includes("Bài tập sót"))
    ).toBe(false);

    // Section giữ lại được PATCH đúng tên — KHÔNG kèm sortOrder (thứ tự qua reorder).
    expect(core.patch).toHaveBeenCalledWith("/courses/sections/s1", {
      name: "Chương 1 (đổi tên)",
    });
    // Lesson l1 tên KHÔNG đổi → KHÔNG PATCH.
    expect(core.patch).not.toHaveBeenCalledWith(
      "/courses/lessons/l1",
      expect.anything()
    );
    // Lesson mới được POST vào đúng section, sortOrder theo vị trí (l1=0, "Bài mới"=1).
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

  it("cây KHÔNG đổi → KHÔNG ghi gì (0 writes)", async () => {
    const same: CourseTreeNode[] = [
      {
        id: "s1",
        key: "s1",
        title: "Chương 1",
        type: "section",
        children: [
          { id: "l1", key: "l1", title: "Bài 1", type: "lesson" },
          { id: "l2", key: "l2", title: "Bài 2", type: "lesson" },
        ],
      },
    ];
    const srv: CourseTreeNode[] = [
      {
        id: "s1",
        key: "s1",
        title: "Chương 1",
        type: "section",
        children: [
          { id: "l1", key: "l1", title: "Bài 1", type: "lesson" },
          { id: "l2", key: "l2", title: "Bài 2", type: "lesson" },
        ],
      },
    ];
    await reconcileCourseTree("course-1", same, srv);
    expect(writeCount()).toBe(0);
  });

  it("chỉ đổi tên 1 bài → đúng 1 write (1 PATCH name, không reorder)", async () => {
    const renamed: CourseTreeNode[] = [
      {
        id: "s1",
        key: "s1",
        title: "Chương 1",
        type: "section",
        children: [{ id: "l1", key: "l1", title: "Bài 1 (mới)", type: "lesson" }],
      },
    ];
    const srv: CourseTreeNode[] = [
      {
        id: "s1",
        key: "s1",
        title: "Chương 1",
        type: "section",
        children: [{ id: "l1", key: "l1", title: "Bài 1", type: "lesson" }],
      },
    ];
    await reconcileCourseTree("course-1", renamed, srv);
    expect(writeCount()).toBe(1);
    expect(core.patch).toHaveBeenCalledWith("/courses/lessons/l1", {
      name: "Bài 1 (mới)",
    });
    expect(core.put).not.toHaveBeenCalled();
    expect(core.post).not.toHaveBeenCalledWith(
      "/courses/course-1/sections/reorder",
      expect.anything()
    );
  });

  it("đổi thứ tự bài trong cùng section → đúng 1 lời gọi lessons/reorder", async () => {
    const moved: CourseTreeNode[] = [
      {
        id: "s1",
        key: "s1",
        title: "Chương 1",
        type: "section",
        children: [
          { id: "l2", key: "l2", title: "Bài 2", type: "lesson" },
          { id: "l1", key: "l1", title: "Bài 1", type: "lesson" },
        ],
      },
    ];
    const srv: CourseTreeNode[] = [
      {
        id: "s1",
        key: "s1",
        title: "Chương 1",
        type: "section",
        children: [
          { id: "l1", key: "l1", title: "Bài 1", type: "lesson" },
          { id: "l2", key: "l2", title: "Bài 2", type: "lesson" },
        ],
      },
    ];
    await reconcileCourseTree("course-1", moved, srv);
    expect(writeCount()).toBe(1);
    expect(core.put).toHaveBeenCalledWith("/courses/course-1/lessons/reorder", {
      sections: [{ sectionId: "s1", orderedLessonIds: ["l2", "l1"] }],
    });
  });

  it("chuyển bài ra khỏi section RỒI xoá section nguồn → reparent PUT chạy TRƯỚC delete (bài không mất)", async () => {
    // server: A=[l1], B=[l2]; draft: B=[l2, l1], A bị xoá. l1 phải được reparent sang B TRƯỚC khi xoá A,
    // nếu không cascade xoá A sẽ cuốn theo l1 và PUT reorder sau đó ném "Lesson not found".
    const draftMoveDelete: CourseTreeNode[] = [
      {
        id: "B",
        key: "B",
        title: "Chương B",
        type: "section",
        children: [
          { id: "l2", key: "l2", title: "Bài 2", type: "lesson" },
          { id: "l1", key: "l1", title: "Bài 1", type: "lesson" },
        ],
      },
    ];
    const srv: CourseTreeNode[] = [
      {
        id: "A",
        key: "A",
        title: "Chương A",
        type: "section",
        children: [{ id: "l1", key: "l1", title: "Bài 1", type: "lesson" }],
      },
      {
        id: "B",
        key: "B",
        title: "Chương B",
        type: "section",
        children: [{ id: "l2", key: "l2", title: "Bài 2", type: "lesson" }],
      },
    ];
    await reconcileCourseTree("course-1", draftMoveDelete, srv);

    // Reparent l1 sang B qua lessons/reorder.
    expect(core.put).toHaveBeenCalledWith("/courses/course-1/lessons/reorder", {
      sections: [{ sectionId: "B", orderedLessonIds: ["l2", "l1"] }],
    });
    // Xoá đúng section nguồn A.
    expect(core.delete).toHaveBeenCalledWith("/courses/sections/A");
    // THỨ TỰ: PUT reorder phải xảy ra TRƯỚC DELETE section A (thứ tự gọi toàn cục của vitest mock).
    const putOrder = core.put.mock.invocationCallOrder[0];
    const deleteAOrder = core.delete.mock.invocationCallOrder[core.delete.mock.calls.findIndex(
      (call) => call[0] === "/courses/sections/A"
    )];
    expect(putOrder).toBeLessThan(deleteAOrder);
  });

  it("chuyển bài sang section khác → reparent qua lessons/reorder (lesson dưới section mới)", async () => {
    const crossMove: CourseTreeNode[] = [
      {
        id: "s1",
        key: "s1",
        title: "Chương 1",
        type: "section",
        children: [{ id: "l1", key: "l1", title: "Bài 1", type: "lesson" }],
      },
      {
        id: "s2",
        key: "s2",
        title: "Chương 2",
        type: "section",
        // l2 vốn thuộc s1 nay chuyển sang s2.
        children: [{ id: "l2", key: "l2", title: "Bài 2", type: "lesson" }],
      },
    ];
    const srv: CourseTreeNode[] = [
      {
        id: "s1",
        key: "s1",
        title: "Chương 1",
        type: "section",
        children: [
          { id: "l1", key: "l1", title: "Bài 1", type: "lesson" },
          { id: "l2", key: "l2", title: "Bài 2", type: "lesson" },
        ],
      },
      { id: "s2", key: "s2", title: "Chương 2", type: "section", children: [] },
    ];
    await reconcileCourseTree("course-1", crossMove, srv);

    expect(core.put).toHaveBeenCalledTimes(1);
    const body = core.put.mock.calls[0][1] as {
      sections: Array<{ sectionId: string; orderedLessonIds: string[] }>;
    };
    // s1 mất l2, s2 nhận l2 — cả hai section thay đổi bố cục, l2 nằm dưới s2 để BE reparent.
    const s2Entry = body.sections.find((e) => e.sectionId === "s2");
    expect(s2Entry?.orderedLessonIds).toEqual(["l2"]);
    const s1Entry = body.sections.find((e) => e.sectionId === "s1");
    expect(s1Entry?.orderedLessonIds).toEqual(["l1"]);
  });
});
