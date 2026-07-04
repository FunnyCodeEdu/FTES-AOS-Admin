import { create } from "zustand";

interface ImpersonationState {
  active: boolean;
  targetUser: { id: string; fullName: string; email: string } | null;
  token: string | null;
  expiresAt: string | null;
  start: (targetUser: { id: string; fullName: string; email: string }, token: string, expiresAt: string) => void;
  exit: () => void;
}

export const useImpersonationStore = create<ImpersonationState>()((set) => ({
  active: false,
  targetUser: null,
  token: null,
  expiresAt: null,
  start: (targetUser, token, expiresAt) => set({ active: true, targetUser, token, expiresAt }),
  exit: () => set({ active: false, targetUser: null, token: null, expiresAt: null }),
}));
