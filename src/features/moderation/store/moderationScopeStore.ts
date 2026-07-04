import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ModerationScopeState {
  selectedScopeId: string | null;
  setSelectedScopeId: (id: string | null) => void;
}

export const useModerationScopeStore = create<ModerationScopeState>()(
  persist(
    (set) => ({
      selectedScopeId: null,
      setSelectedScopeId: (id) => set({ selectedScopeId: id }),
    }),
    { name: "ftes-moderation-scope" }
  )
);
