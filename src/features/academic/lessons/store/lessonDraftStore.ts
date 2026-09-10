import { create } from "zustand";

export interface LessonDraft {
  body: string;
  /** Nội dung server mà lần sửa này bắt đầu từ đó. */
  baseBody: string;
  /** Mốc optimistic-lock đi cùng baseBody; không được đổi khi query nền refetch. */
  baseUpdatedAt: string | null;
}

interface DraftState {
  drafts: Record<string, LessonDraft>;
  setDraft: (
    lessonId: string,
    body: string,
    baseBody: string,
    baseUpdatedAt: string | null
  ) => void;
  acknowledgeSaved: (lessonId: string, savedBody: string, updatedAt: string | null) => void;
  clearDraft: (lessonId: string) => void;
}

export const useLessonDraftStore = create<DraftState>()((set) => ({
  drafts: {},
  setDraft: (lessonId, body, baseBody, baseUpdatedAt) =>
    set((state) => {
      const current = state.drafts[lessonId];
      return {
        drafts: {
          ...state.drafts,
          [lessonId]: current
            ? { ...current, body }
            : { body, baseBody, baseUpdatedAt },
        },
      };
    }),
  acknowledgeSaved: (lessonId, savedBody, updatedAt) =>
    set((state) => {
      const current = state.drafts[lessonId];
      if (!current) return state;

      const next = { ...state.drafts };
      if (current.body === savedBody) {
        // Giữ một snapshot "sạch" cho tới khi query cache cũng nhìn thấy đúng body/mốc này. Xoá
        // ngay ở đây tạo ra một render trung gian có thể nạp lesson.body CŨ ngược vào textarea.
        next[lessonId] = { body: savedBody, baseBody: savedBody, baseUpdatedAt: updatedAt };
      } else {
        // Người dùng đã gõ tiếp lúc request cũ đang bay: giữ body mới, nhưng lần save kế tiếp phải
        // bắt đầu từ đúng phiên bản vừa được server xác nhận.
        next[lessonId] = { ...current, baseBody: savedBody, baseUpdatedAt: updatedAt };
      }
      return { drafts: next };
    }),
  clearDraft: (lessonId) =>
    set((state) => {
      const next = { ...state.drafts };
      delete next[lessonId];
      return { drafts: next };
    }),
}));
