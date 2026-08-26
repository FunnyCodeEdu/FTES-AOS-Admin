import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BroadcastChannel, BroadcastSegment } from "../shared/types";

interface BroadcastDraft {
  title: string;
  content: string;
  /** Đường dẫn nội bộ bắt đầu bằng "/"; bỏ trống = thông báo không bấm được. */
  deepLink?: string;
  channels: BroadcastChannel[];
  segment: BroadcastSegment;
  scheduleAt?: string;
}

interface BroadcastDraftState {
  draft: BroadcastDraft;
  setDraft: (draft: Partial<BroadcastDraft>) => void;
  resetDraft: () => void;
}

const DEFAULT_DRAFT: BroadcastDraft = {
  title: "",
  content: "",
  deepLink: "",
  channels: ["in-app"],
  // Mặc định là chế độ "theo vai trò" với danh sách RỖNG, không phải "tất cả": mở trang lên mà đã
  // sẵn sàng bắn cho toàn hệ thống thì chỉ cần một cú bấm nhầm là hỏng. Người gửi phải tự chọn.
  segment: { allUsers: false, roles: [] },
};

export const useBroadcastDraftStore = create<BroadcastDraftState>()(
  persist(
    (set) => ({
      draft: DEFAULT_DRAFT,
      setDraft: (partial) => set((state) => ({ draft: { ...state.draft, ...partial } })),
      resetDraft: () => set({ draft: DEFAULT_DRAFT }),
    }),
    { name: "ftes-broadcast-draft" }
  )
);
