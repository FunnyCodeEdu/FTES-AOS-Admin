import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ScopedGrant } from "../../auth/store";

export interface SubjectScope {
  scopeId: string;
  name: string; // display name; falls back to scopeId if metadata unavailable
}

interface CtvScopeState {
  scopes: SubjectScope[];
  activeScopeId: string | null;
  setScopes: (scopes: SubjectScope[]) => void;
  initFromGrants: (grants: ScopedGrant[]) => void;
  setActiveScope: (scopeId: string | null) => void;
}

const STORAGE_KEY = "ftes-admin-academic-ctv-scope";

function isResourceScopeGrant(g: ScopedGrant): boolean {
  if (g.scopeType !== "SUBJECT") return false;
  if (!g.scopeId) return false;
  if (g.expiresAt && new Date(g.expiresAt) <= new Date()) return false;
  return ["resource.view", "resource.upload", "admin.resource.manage"].includes(g.permission);
}

export const useCtvScopeStore = create<CtvScopeState>()(
  persist(
    (set, get) => ({
      scopes: [],
      activeScopeId: null,
      setScopes: (scopes) => {
        const nextActive =
          scopes.length === 0
            ? null
            : scopes.find((s) => s.scopeId === get().activeScopeId)
              ? get().activeScopeId
              : scopes[0]?.scopeId ?? null;
        set({ scopes, activeScopeId: nextActive });
      },
      initFromGrants: (grants) => {
        const subjectIds = new Set<string>();
        for (const g of grants) {
          if (isResourceScopeGrant(g)) {
            subjectIds.add(g.scopeId as string);
          }
        }
        const scopes: SubjectScope[] = Array.from(subjectIds).map((id) => ({
          scopeId: id,
          name: id, // real subject name loaded later by caller if available
        }));
        const nextActive =
          scopes.length === 0
            ? null
            : scopes.find((s) => s.scopeId === get().activeScopeId)
              ? get().activeScopeId
              : scopes[0]?.scopeId ?? null;
        set({ scopes, activeScopeId: nextActive });
      },
      setActiveScope: (scopeId) => set({ activeScopeId: scopeId }),
    }),
    {
      name: STORAGE_KEY,
      storage: {
        getItem: (name) => {
          const raw = sessionStorage.getItem(name);
          return raw ? { state: JSON.parse(raw) as CtvScopeState } : null;
        },
        setItem: (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value.state));
        },
        removeItem: (name) => sessionStorage.removeItem(name),
      },
    }
  )
);

export function getSubjectScopes(grants: ScopedGrant[]): SubjectScope[] {
  const subjectIds = new Set<string>();
  for (const g of grants) {
    if (isResourceScopeGrant(g)) {
      subjectIds.add(g.scopeId as string);
    }
  }
  return Array.from(subjectIds).map((id) => ({ scopeId: id, name: id }));
}
