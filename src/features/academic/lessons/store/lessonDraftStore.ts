import { create } from "zustand";

interface DraftState {
  drafts: Record<string, string>;
  setDraft: (lessonId: string, body: string) => void;
  clearDraft: (lessonId: string) => void;
}

export const useLessonDraftStore = create<DraftState>()((set) => ({
  drafts: {},
  setDraft: (lessonId, body) =>
    set((state) => ({ drafts: { ...state.drafts, [lessonId]: body } })),
  clearDraft: (lessonId) =>
    set((state) => {
      const next = { ...state.drafts };
      delete next[lessonId];
      return { drafts: next };
    }),
}));
