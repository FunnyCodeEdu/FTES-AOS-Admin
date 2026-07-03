import { create } from "zustand";
import { persist } from "zustand/middleware";

const UI_STORAGE_KEY = "ftes-admin-ui";

function getStoredTheme(): "light" | "dark" | null {
  try {
    const raw = localStorage.getItem(UI_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { theme?: "light" | "dark" } };
    return parsed.state?.theme ?? null;
  } catch {
    return null;
  }
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

interface UIState {
  theme: "light" | "dark";
  sidebarCollapsed: boolean;
  toggleTheme: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: getStoredTheme() ?? getSystemTheme(),
      sidebarCollapsed: false,
      toggleTheme: () => set({ theme: get().theme === "light" ? "dark" : "light" }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    { name: UI_STORAGE_KEY }
  )
);
