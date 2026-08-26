import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import { coreClient } from "./client";
import { useAuthStore } from "../../features/auth/store";

/**
 * Hồi quy "phải đăng nhập hai lần" ở trang admin.
 *
 * Interceptor 401 gặp lúc refresh cũng hỏng thì xoá phiên + đá về /login. Đúng với một request
 * chính; SAI với một request phụ chạy nền — nó thổi bay đúng phiên vừa đăng nhập xong, và
 * `try/catch` ở nơi gọi không cứu được vì thiệt hại nằm ở tác dụng phụ chứ không ở giá trị trả về.
 */

/** Giả một response 401 cho MỌI request đi qua coreClient. */
function alwaysUnauthorized() {
  coreClient.defaults.adapter = async (config) => {
    const error = new axios.AxiosError(
      "Request failed with status code 401",
      "ERR_BAD_REQUEST",
      config as never,
      null,
      {
        status: 401,
        statusText: "Unauthorized",
        data: { code: 401, message: "Unauthorized", data: null },
        headers: {},
        config: config as never,
      } as never
    );
    throw error;
  };
}

const loggedIn = () =>
  useAuthStore.setState({ accessToken: "fresh-token", refreshToken: "r1" });

beforeEach(() => {
  alwaysUnauthorized();
  // Refresh cũng trượt → đẩy interceptor vào đúng nhánh xoá phiên.
  vi.spyOn(axios, "post").mockRejectedValue(new Error("refresh failed"));
  Object.defineProperty(window, "location", {
    value: { pathname: "/courses", search: "", href: "/courses" },
    writable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  delete coreClient.defaults.adapter;
});

describe("401 + refresh trượt", () => {
  it("request phụ (bestEffortAuth) KHÔNG được xoá phiên hay đá về /login", async () => {
    loggedIn();
    await expect(
      coreClient.get("/identity/me/permissions", { bestEffortAuth: true })
    ).rejects.toThrow();

    expect(useAuthStore.getState().accessToken).toBe("fresh-token");
    expect(window.location.href).toBe("/courses");
  });

  it("request thường thì vẫn xoá phiên và đá về /login", async () => {
    loggedIn();
    await expect(coreClient.get("/courses")).rejects.toThrow();

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(window.location.href).toContain("/login");
  });

  it("đang ở /login thì không reload cứng (huỷ mất chính request đăng nhập)", async () => {
    loggedIn();
    Object.defineProperty(window, "location", {
      value: { pathname: "/login", search: "", href: "/login" },
      writable: true,
    });

    await expect(coreClient.get("/courses")).rejects.toThrow();

    expect(window.location.href).toBe("/login");
  });
});
