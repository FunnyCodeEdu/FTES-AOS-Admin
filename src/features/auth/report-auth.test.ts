import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient, renderHook } from "../../shared/testing/hookHarness";
const mocks = vi.hoisted(() => ({ corePost: vi.fn(), coreGet: vi.fn(), authPost: vi.fn(), graphql: vi.fn() }));
vi.mock("../../shared/api/client", () => ({
  coreClient: { post: mocks.corePost, get: mocks.coreGet }, authClient: { post: mocks.authPost },
}));
vi.mock("../../shared/api/graphql", () => ({ graphqlRequest: mocks.graphql }));
import { fetchMe, useLogin, useLogout } from "./api";
import { useAuthStore } from "./store";
const reportToken = `e30.${btoa(JSON.stringify({ iss: "ftes-market-reviewer", aud: "market-insights" }))}.test-signature`;
beforeEach(() => { vi.clearAllMocks(); useAuthStore.getState().clearSession(); });
describe("separate report login lifecycle", () => {
  it("report login never sends credentials to normal system auth", async () => {
    mocks.corePost.mockResolvedValue({ data: { accessToken: reportToken, expiresIn: 1800 } });
    const hook = renderHook(useLogin, createTestQueryClient());
    await act(async () => { await hook.result.current.mutateAsync({ identifier: "mentor.test", password: "test-only", reportOnly: true }); });
    expect(mocks.corePost).toHaveBeenCalledWith("/admin/analytics/market-insights/login", { identifier: "mentor.test", password: "test-only" });
    expect(mocks.authPost).not.toHaveBeenCalled(); hook.unmount();
  });
  it("normal login keeps the existing system endpoint", async () => {
    mocks.authPost.mockResolvedValue({ data: { accessToken: "normal", refreshToken: "refresh", expiresIn: 900 } });
    const hook = renderHook(useLogin, createTestQueryClient());
    await act(async () => { await hook.result.current.mutateAsync({ identifier: "admin", password: "test-only" }); });
    expect(mocks.authPost).toHaveBeenCalledWith("/login", { identifier: "admin", password: "test-only" });
    expect(mocks.corePost).not.toHaveBeenCalled(); hook.unmount();
  });
  it("report bootstrap never calls GraphQL or general permission endpoints", async () => {
    useAuthStore.getState().setTokens(reportToken, "");
    const access = { user: { id: "test", fullName: "Mentor" }, permissions: ["analytics.market.view", "analytics.market.readonly"], scopedGrants: [], superAdmin: false };
    mocks.coreGet.mockResolvedValue({ data: access });
    expect(await fetchMe()).toEqual(access);
    expect(mocks.coreGet).toHaveBeenCalledWith("/admin/analytics/market-insights/access");
    expect(mocks.graphql).not.toHaveBeenCalled();
  });
  it("report logout revokes its report session instead of using general refresh tokens", async () => {
    useAuthStore.getState().setTokens(reportToken, ""); mocks.corePost.mockResolvedValue({ data: { loggedOut: true } });
    const hook = renderHook(useLogout, createTestQueryClient());
    await act(async () => { await hook.result.current.mutateAsync(); });
    expect(mocks.corePost).toHaveBeenCalledWith("/admin/analytics/market-insights/logout");
    expect(mocks.authPost).not.toHaveBeenCalled(); hook.unmount();
  });
});
