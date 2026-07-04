import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BroadcastChannel, BroadcastSegment } from "../shared/types";

interface BroadcastDraft {
  title: string;
  content: string;
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
  channels: ["in-app"],
  segment: {},
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
