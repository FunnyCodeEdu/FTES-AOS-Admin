import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Phiên đăng nhập admin. Permission-driven (docs/ADMIN-ARCHITECTURE.md §2):
 * BE trả danh sách permission leaf + scoped grants sau khi login —
 * nav/route/action gate theo permissions, KHÔNG so sánh role string.
 */
export interface ScopedGrant {
  permission: string;
  scopeType: "GLOBAL" | "GROUP" | "SUBJECT" | "RESOURCE_SET" | "COURSE";
  scopeId: string | null;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  permissions: string[];
  grants: ScopedGrant[];
  setSession: (s: {
    accessToken: string;
    refreshToken: string;
    permissions: string[];
    grants: ScopedGrant[];
  }) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      permissions: [],
      grants: [],
      setSession: (s) => set(s),
      clear: () =>
        set({ accessToken: null, refreshToken: null, permissions: [], grants: [] }),
    }),
    { name: "ftes-admin-auth" }
  )
);

export const useHasPermission = (permission: string): boolean =>
  useAuthStore((s) => s.permissions.includes(permission));
