import { beforeEach, describe, expect, it } from "vitest";
import { useCourseTreeDraftStore } from "./courseTreeDraftStore";
import type { CourseTreeNode } from "../../types";

// Task 4.2 — admin-lesson-exercise-authoring (admin-tree-assignment-node-removal):
// draft giữ node assignment sót (hiện cảnh báo, gỡ tay) nhưng KHÔNG cho thêm mới;
// move sai tầng bị CHẶN thẳng thay vì mất node im lặng khi lưu.

function fixtureTree(): CourseTreeNode[] {
  return [
    {
      id: "s1",
      key: "s1",
      title: "Chương 1",
      type: "section",
      children: [
        { id: "l1", key: "l1", title: "Bài 1", type: "lesson" },
        { key: "a1", title: "Bài tập sót", type: "assignment" },
      ],
    },
    {
      id: "s2",
      key: "s2",
      title: "Chương 2",
      type: "section",
      children: [{ id: "l2", key: "l2", title: "Bài 2", type: "lesson" }],
    },
  ];
}

function countNodes(nodes: CourseTreeNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countNodes(n.children ?? []), 0);
}

const store = () => useCourseTreeDraftStore.getState();

beforeEach(() => {
  store().init(fixtureTree());
});

describe("courseTreeDraftStore", () => {
  it("init giữ nguyên node assignment sót trong draft (để user thấy cảnh báo + tự gỡ)", () => {
    const { tree, dirty } = store();
    expect(tree[0].children?.map((c) => c.key)).toEqual(["l1", "a1"]);
    expect(dirty).toBe(false);
  });

  it("removeNode gỡ đúng node assignment, KHÔNG mất node khác", () => {
    store().removeNode("a1");
    const { tree } = store();
    expect(tree[0].children?.map((c) => c.key)).toEqual(["l1"]);
    expect(countNodes(tree)).toBe(4); // s1, l1, s2, l2
  });

  it("addNode chỉ còn section/lesson: lesson vào section OK, lesson top-level / vào lesson bị chặn", () => {
    store().addNode("s1", "lesson");
    expect(store().tree[0].children).toHaveLength(3);

    const before = countNodes(store().tree);
    store().addNode(null, "lesson"); // top-level chỉ nhận section
    store().addNode("l1", "lesson"); // parent phải là section
    expect(countNodes(store().tree)).toBe(before);
  });

  it("moveNode sai tầng bị CHẶN (giữ vị trí cũ) — hết drop-rồi-mất-âm-thầm", () => {
    const before = JSON.stringify(store().tree);
    store().moveNode("l1", "s2", -1); // lesson thành sibling tầng section
    store().moveNode("s2", "l1", 0); // section thả vào lesson
    store().moveNode("l1", "a1", 0); // thả vào node assignment
    expect(JSON.stringify(store().tree)).toBe(before);
  });

  it("moveNode hợp lệ (lesson sang section khác) di chuyển thật, tổng node không đổi", () => {
    const before = countNodes(store().tree);
    store().moveNode("l1", "s2", 0);
    const { tree } = store();
    expect(tree[0].children?.map((c) => c.key)).toEqual(["a1"]);
    expect(tree[1].children?.map((c) => c.key)).toEqual(["l2", "l1"]);
    expect(countNodes(tree)).toBe(before);
  });
});
