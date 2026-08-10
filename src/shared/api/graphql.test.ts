import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./client")>();
  return { ...actual, refreshAccessToken: vi.fn() };
});

import { graphqlRequest } from "./graphql";
import { ApiError, ForbiddenError, refreshAccessToken } from "./client";
import { useAuthStore } from "../../features/auth/store";

const refresh = refreshAccessToken as unknown as ReturnType<typeof vi.fn>;

/** Response giả: chỉ cần status + json(). */
const res = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;

/** Envelope lỗi BE trả kèm HTTP 401 — KHÔNG phải hình dạng GraphQL. */
const unauthorized = () =>
  res(401, { code: 401, message: "Unauthorized", data: { errorCode: "PLATFORM_UNAUTHORIZED" } });

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ accessToken: "stale-token" });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// sse-crlf... không liên quan; đây là admin-graphql-refresh-on-401:
// REST (axios interceptor client.ts) tự refresh+retry khi 401, GraphQL thì trước đây không —
// nên `me` chết là permissions rỗng và mọi <Can> biến mất.

describe("graphqlRequest — 401 giữa luồng", () => {
  it("401 rồi 200: refresh ĐÚNG 1 lần, retry mang token mới, trả data", async () => {
    refresh.mockResolvedValue("fresh-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(res(200, { data: { me: { permissions: ["event.manage"] } } }));
    vi.stubGlobal("fetch", fetchMock);

    const data = await graphqlRequest<{ me: { permissions: string[] } }>("query Me { me { permissions } }");

    expect(data.me.permissions).toEqual(["event.manage"]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Lượt retry PHẢI mang token mới, không phải token cũ.
    const headers = fetchMock.mock.calls[1][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer fresh-token");
  });

  it("401 hai lần liên tiếp: dừng hẳn, KHÔNG lặp vô hạn", async () => {
    refresh.mockResolvedValue("fresh-token");
    const fetchMock = vi.fn().mockResolvedValue(unauthorized());
    vi.stubGlobal("fetch", fetchMock);

    await expect(graphqlRequest("query Me { me { permissions } }")).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("refresh thất bại → báo phiên hết hạn, không gọi lại request", async () => {
    refresh.mockRejectedValue(new Error("refresh token hỏng"));
    const fetchMock = vi.fn().mockResolvedValue(unauthorized());
    vi.stubGlobal("fetch", fetchMock);

    await expect(graphqlRequest("query Me { me { permissions } }")).rejects.toMatchObject({
      message: "Phiên đăng nhập đã hết hạn",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("200 ngay lần đầu: KHÔNG đụng tới refresh", async () => {
    const fetchMock = vi.fn().mockResolvedValue(res(200, { data: { ok: true } }));
    vi.stubGlobal("fetch", fetchMock);

    await graphqlRequest("query X { ok }");

    expect(refresh).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("giữ nguyên nhánh 403 ADMIN_ACCESS_DENIED (không được refresh nhầm)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(res(200, { errors: [{ message: "x", extensions: { code: "ADMIN_ACCESS_DENIED" } }] }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(graphqlRequest("query X { ok }")).rejects.toBeInstanceOf(ForbiddenError);
    expect(refresh).not.toHaveBeenCalled();
  });
});
