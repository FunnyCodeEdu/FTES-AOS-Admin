import { beforeEach, describe, expect, it, vi } from "vitest";

const REFRESH_KEY = "ftes-admin-refresh";
const REMEMBER_KEY = "ftes-admin-remember";

/**
 * Phiên phải sống qua việc đóng tab. Bản trước mặc định `remember=false` nên refresh token rơi vào
 * `sessionStorage` — đóng tab hoặc mở tab mới là mất phiên và phải đăng nhập lại. Các test dưới
 * khoá lại đúng hành vi đó ở mức storage, không phụ thuộc UI.
 */
async function freshStore() {
  vi.resetModules();
  const mod = await import("./store");
  return mod.useAuthStore;
}

function session(refreshToken: string) {
  return {
    accessToken: "access-token",
    refreshToken,
    user: { id: "u1", email: "a@ftes.vn", fullName: "A" },
    permissions: [],
    scopedGrants: [],
  };
}

describe("giữ phiên đăng nhập", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("máy sạch: mặc định là GIỮ đăng nhập", async () => {
    const useAuthStore = await freshStore();
    expect(useAuthStore.getState().remember).toBe(true);
  });

  it("đăng nhập với remember: token nằm ở localStorage nên sống qua việc đóng tab", async () => {
    const useAuthStore = await freshStore();
    useAuthStore.getState().setSession(session("refresh-1"), true);

    expect(localStorage.getItem(REFRESH_KEY)).toBe("refresh-1");
    expect(sessionStorage.getItem(REFRESH_KEY)).toBeNull();

    // Mở lại web = module nạp lại: store phải tự nhặt được token đang lưu.
    const reopened = await freshStore();
    expect(reopened.getState().refreshToken).toBe("refresh-1");
  });

  it("người dùng bỏ tick: token chỉ sống trong tab", async () => {
    const useAuthStore = await freshStore();
    useAuthStore.getState().setSession(session("refresh-2"), false);

    expect(sessionStorage.getItem(REFRESH_KEY)).toBe("refresh-2");
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
    expect(localStorage.getItem(REMEMBER_KEY)).toBeNull();

    // Cùng tab thì vẫn còn, và lựa chọn "không ghi nhớ" không bị đảo ngược thành mặc định mới.
    const reopened = await freshStore();
    expect(reopened.getState().refreshToken).toBe("refresh-2");
    expect(reopened.getState().remember).toBe(false);
  });

  it("refresh xoay vòng vẫn giữ đúng nơi lưu đã chọn", async () => {
    const useAuthStore = await freshStore();
    useAuthStore.getState().setSession(session("refresh-3"), true);
    useAuthStore.getState().setTokens("access-2", "refresh-4");

    expect(localStorage.getItem(REFRESH_KEY)).toBe("refresh-4");
    expect(sessionStorage.getItem(REFRESH_KEY)).toBeNull();
  });

  it("đăng xuất dọn sạch cả hai nơi lưu", async () => {
    const useAuthStore = await freshStore();
    useAuthStore.getState().setSession(session("refresh-5"), true);
    useAuthStore.getState().clearSession();

    expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
    expect(sessionStorage.getItem(REFRESH_KEY)).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBeNull();
  });
});
