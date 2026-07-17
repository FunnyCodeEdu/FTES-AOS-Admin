import { create } from "zustand";
import type { CourseTreeNode } from "../../types";

interface CourseTreeDraftState {
  tree: CourseTreeNode[];
  selectedKey: string | null;
  dirty: boolean;
  init: (tree: CourseTreeNode[]) => void;
  selectNode: (key: string | null) => void;
  updateNode: (key: string, patch: Partial<CourseTreeNode>) => void;
  // Chỉ còn section/lesson — node "assignment" đã gỡ (change admin-tree-assignment-node-removal),
  // soạn bài tập chuyển về tab Bài tập của LessonEditPage.
  addNode: (parentKey: string | null, type: "section" | "lesson") => void;
  removeNode: (key: string) => void;
  moveNode: (dragKey: string, dropKey: string, dropPosition: number) => void;
  setTree: (tree: CourseTreeNode[]) => void;
  markClean: () => void;
}

function generateKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function findNodeAndParent(
  nodes: CourseTreeNode[],
  key: string,
  parent: CourseTreeNode | null = null
): { node: CourseTreeNode; parent: CourseTreeNode | null; siblings: CourseTreeNode[]; index: number } | null {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].key === key) {
      return { node: nodes[i], parent, siblings: nodes, index: i };
    }
    if (nodes[i].children) {
      const found = findNodeAndParent(nodes[i].children ?? [], key, nodes[i]);
      if (found) return found;
    }
  }
  return null;
}

function cloneTree(tree: CourseTreeNode[]): CourseTreeNode[] {
  return tree.map((n) => ({
    ...n,
    children: n.children ? cloneTree(n.children) : undefined,
  }));
}

export const useCourseTreeDraftStore = create<CourseTreeDraftState>()((set, get) => ({
  tree: [],
  selectedKey: null,
  dirty: false,
  init: (tree) => set({ tree: cloneTree(tree), selectedKey: null, dirty: false }),
  selectNode: (key) => set({ selectedKey: key }),
  updateNode: (key, patch) => {
    const tree = cloneTree(get().tree);
    const found = findNodeAndParent(tree, key);
    if (found) {
      Object.assign(found.node, patch);
      set({ tree, dirty: true });
    }
  },
  addNode: (parentKey, type) => {
    const tree = cloneTree(get().tree);
    const newNode: CourseTreeNode = {
      key: generateKey(),
      title: type === "section" ? "Chương mới" : "Bài học mới",
      type,
      children: [],
    };
    if (!parentKey) {
      if (type === "section") {
        tree.push(newNode);
      }
    } else {
      const found = findNodeAndParent(tree, parentKey);
      // Chỉ cho lesson vào section. Không còn add assignment vào lesson
      // (change admin-tree-assignment-node-removal).
      if (found && found.node.type === "section" && type === "lesson") {
        found.node.children = found.node.children ?? [];
        found.node.children.push(newNode);
      }
    }
    set({ tree, selectedKey: newNode.key, dirty: true });
  },
  removeNode: (key) => {
    const tree = cloneTree(get().tree);
    const found = findNodeAndParent(tree, key);
    if (found) {
      found.siblings.splice(found.index, 1);
      set({ tree, selectedKey: null, dirty: true });
    }
  },
  moveNode: (dragKey, dropKey, dropPosition) => {
    if (dragKey === dropKey) return;
    const tree = cloneTree(get().tree);
    const dragged = findNodeAndParent(tree, dragKey);
    const target = findNodeAndParent(tree, dropKey);
    if (!dragged || !target) return;
    const draggedType = dragged.node.type;

    // Validate TRƯỚC khi splice — mục tiêu change là "hết drop im lặng". Move sai tầng
    // (lesson lên top-level, section vào lesson, thả vào assignment) trước đây vẫn hiển thị
    // trong draft nhưng bị reconcileCourseTree bỏ qua khi lưu → node biến mất âm thầm.
    // Ta CHẶN thẳng move không hợp lệ (giữ nguyên vị trí cũ) thay vì để mất lặng lẽ.
    if (dropPosition === 0) {
      // Thả VÀO node: chỉ cho lesson vào section.
      if (!(target.node.type === "section" && draggedType === "lesson")) return;
    } else {
      // Thả cạnh target (before/after) → dragged thành sibling cùng tầng với target.
      // target top-level (parent null) = tầng section; target nested = tầng lesson.
      const siblingLevelType = target.parent === null ? "section" : "lesson";
      if (draggedType !== siblingLevelType) return;
    }

    // Remove from old position (move đã hợp lệ nên chắc chắn re-insert được → không mất node)
    dragged.siblings.splice(dragged.index, 1);
    if (dropPosition === 0) {
      // Re-find: index của target có thể dịch sau khi splice dragged khỏi cùng mảng siblings.
      const t = findNodeAndParent(tree, dropKey);
      if (t) {
        t.node.children = t.node.children ?? [];
        t.node.children.push(dragged.node);
      }
    } else {
      const t = findNodeAndParent(tree, dropKey);
      if (t) {
        const insertIndex = dropPosition < 0 ? t.index : t.index + 1;
        t.siblings.splice(insertIndex, 0, dragged.node);
      }
    }
    set({ tree, dirty: true });
  },
  setTree: (tree) => set({ tree: cloneTree(tree), dirty: false }),
  markClean: () => set({ dirty: false }),
}));
