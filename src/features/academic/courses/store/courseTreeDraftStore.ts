import { create } from "zustand";
import type { CourseTreeNode } from "../../types";

interface CourseTreeDraftState {
  tree: CourseTreeNode[];
  selectedKey: string | null;
  dirty: boolean;
  init: (tree: CourseTreeNode[]) => void;
  selectNode: (key: string | null) => void;
  updateNode: (key: string, patch: Partial<CourseTreeNode>) => void;
  addNode: (parentKey: string | null, type: CourseTreeNode["type"]) => void;
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
      title: type === "section" ? "Chương mới" : type === "lesson" ? "Bài học mới" : "Bài tập mới",
      type,
      children: type !== "assignment" ? [] : undefined,
    };
    if (!parentKey) {
      if (type === "section") {
        tree.push(newNode);
      }
    } else {
      const found = findNodeAndParent(tree, parentKey);
      if (found) {
        if (found.node.type === "section" && type !== "section") {
          found.node.children = found.node.children ?? [];
          found.node.children.push(newNode);
        } else if (found.node.type === "lesson" && type === "assignment") {
          found.node.children = found.node.children ?? [];
          found.node.children.push(newNode);
        }
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
    const tree = cloneTree(get().tree);
    const dragged = findNodeAndParent(tree, dragKey);
    if (!dragged) return;
    // Remove from old position
    dragged.siblings.splice(dragged.index, 1);
    // Insert at new position
    if (dropPosition === 0) {
      // Drop into node
      const target = findNodeAndParent(tree, dropKey);
      if (target && target.node.type !== "assignment") {
        target.node.children = target.node.children ?? [];
        target.node.children.push(dragged.node);
      }
    } else {
      const target = findNodeAndParent(tree, dropKey);
      if (target) {
        const insertIndex = dropPosition < 0 ? target.index : target.index + 1;
        target.siblings.splice(insertIndex, 0, dragged.node);
      }
    }
    set({ tree, dirty: true });
  },
  setTree: (tree) => set({ tree: cloneTree(tree), dirty: false }),
  markClean: () => set({ dirty: false }),
}));
