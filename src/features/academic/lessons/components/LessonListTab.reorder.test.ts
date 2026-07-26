import { describe, expect, it } from "vitest";
import { dropPositionFor } from "./LessonListTab";
import { useCourseTreeDraftStore } from "../../courses/store/courseTreeDraftStore";
import type { CourseTreeNode } from "../../types";

/**
 * Kéo-thả đổi thứ tự bài học: `dropPositionFor` + `moveNode` phải cho ra ĐÚNG thứ tự người dùng
 * thả. Sai dấu là node rơi lệch một ô — nhìn qua vẫn "có đảo" nên dễ lọt.
 */
function tree(): CourseTreeNode[] {
  return [
    {
      key: "s1",
      id: "s1",
      title: "Chương 1",
      type: "section",
      children: ["A", "B", "C"].map((t) => ({ key: t, id: t, title: t, type: "lesson" as const })),
    },
    { key: "s2", id: "s2", title: "Chương 2", type: "section", children: [] },
  ];
}

function lessonOrder(): string[] {
  return (useCourseTreeDraftStore.getState().tree[0].children ?? []).map((n) => n.title);
}

function drop(dragKey: string, dropKey: string) {
  const siblings = useCourseTreeDraftStore.getState().tree[0].children ?? [];
  const dragIdx = siblings.findIndex((n) => n.key === dragKey);
  const dropIdx = siblings.findIndex((n) => n.key === dropKey);
  useCourseTreeDraftStore.getState().moveNode(dragKey, dropKey, dropPositionFor(dragIdx, dropIdx));
}

describe("kéo-thả đổi thứ tự bài học", () => {
  it("kéo bài cuối lên đầu → nó thành bài đầu", () => {
    useCourseTreeDraftStore.getState().init(tree());
    drop("C", "A");
    expect(lessonOrder()).toEqual(["C", "A", "B"]);
  });

  it("kéo bài đầu xuống cuối → nó thành bài cuối", () => {
    useCourseTreeDraftStore.getState().init(tree());
    drop("A", "C");
    expect(lessonOrder()).toEqual(["B", "C", "A"]);
  });

  it("đổi chỗ 2 bài liền kề", () => {
    useCourseTreeDraftStore.getState().init(tree());
    drop("B", "A");
    expect(lessonOrder()).toEqual(["B", "A", "C"]);
  });

  it("kéo chương cũng dùng chung quy tắc", () => {
    useCourseTreeDraftStore.getState().init(tree());
    useCourseTreeDraftStore.getState().moveNode("s2", "s1", dropPositionFor(1, 0));
    expect(useCourseTreeDraftStore.getState().tree.map((n) => n.key)).toEqual(["s2", "s1"]);
  });

  it("thứ tự mới là bản nháp CHƯA lưu (phải bấm Lưu thay đổi)", () => {
    useCourseTreeDraftStore.getState().init(tree());
    drop("C", "A");
    expect(useCourseTreeDraftStore.getState().dirty).toBe(true);
  });
});
