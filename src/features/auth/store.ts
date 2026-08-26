import { create } from "zustand";

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

export interface ScopedGrant {
  permission: string;
  scopeType: "GLOBAL" | "GROUP" | "SUBJECT" | "RESOURCE_SET" | "COURSE";
  scopeId: string | null;
  expiresAt?: string;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: User;
  permissions: string[];
  scopedGrants: ScopedGrant[];
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  permissions: string[];
  scopedGrants: ScopedGrant[];
  remember: boolean;
  setSession: (session: Session, remember: boolean) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearSession: () => void;
}

const REFRESH_KEY = "ftes-admin-refresh";
const REMEMBER_KEY = "ftes-admin-remember";

const refreshStorage = {
  get(): string | null {
    return localStorage.getItem(REFRESH_KEY) ?? sessionStorage.getItem(REFRESH_KEY);
  },
  /**
   * Phien co duoc giu qua viec dong tab hay khong.
   *
   * MAC DINH LA CO. Truoc day ham nay tra ve false khi chua co dau vet nao, nen refresh token roi
   * vao `sessionStorage` — ma sessionStorage chet theo TAB: mo link o tab moi, dong tab, hoac bi
   * dien thoai thu hoi tab nen la mat phien va phai dang nhap lai. Do chinh la trieu chung
   * "phai dang nhap 2 lan" va "vao lai web la bi out".
   *
   * Chi tra ve false khi nguoi dung DA CHU DONG bo tick — dau vet cua no la token dang nam trong
   * sessionStorage.
   */
  isRemembered(): boolean {
    if (localStorage.getItem(REMEMBER_KEY) === "1") return true;
    if (sessionStorage.getItem(REFRESH_KEY) !== null) return false;
    return true;
  },
  set(token: string, remember: boolean) {
    this.clear();
    if (remember) {
      localStorage.setItem(REMEMBER_KEY, "1");
      localStorage.setItem(REFRESH_KEY, token);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
      sessionStorage.setItem(REFRESH_KEY, token);
    }
  },
  clear() {
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  },
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  accessToken: null,
  refreshToken: refreshStorage.get(),
  user: null,
  permissions: [],
  scopedGrants: [],
  remember: refreshStorage.isRemembered(),
  setSession: (session, remember) => {
    refreshStorage.set(session.refreshToken, remember);
    set({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user,
      permissions: session.permissions,
      scopedGrants: session.scopedGrants,
      remember,
    });
  },
  setTokens: (accessToken, refreshToken) => {
    refreshStorage.set(refreshToken, get().remember);
    set({ accessToken, refreshToken });
  },
  clearSession: () => {
    refreshStorage.clear();
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      permissions: [],
      scopedGrants: [],
      remember: false,
    });
  },
}));

export const selectIsAuthenticated = (state: AuthState) => state.accessToken !== null;
