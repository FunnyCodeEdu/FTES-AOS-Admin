import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { renderComponent } from "../testing/hookHarness";

const { me, token } = vi.hoisted(() => ({ me: vi.fn(), token: vi.fn() }));
vi.mock("../../features/auth/api", () => ({ useMe: me }));
vi.mock("../../features/auth/store", () => ({ useAuthStore: (select: (s: { accessToken: string | null }) => unknown) => select({ accessToken: token() }) }));
import { PermissionRoute } from "./PermissionRoute";

let mounted: ReturnType<typeof renderComponent> | undefined;
afterEach(() => mounted?.unmount());
function renderAt(path: string, permissions: string[], superAdmin = false) {
  token.mockReturnValue("test-token");
  me.mockReturnValue({ data: { permissions, superAdmin, scopedGrants: [] }, isLoading: false, refetch: vi.fn() });
  mounted = renderComponent(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/" element={<PermissionRoute><div>REPORT_ONLY</div></PermissionRoute>} />
    <Route path="/users" element={<PermissionRoute requiredPermissions={["user.manage"]}><div>USER_EDITOR</div></PermissionRoute>} />
    <Route path="/analytics/market" element={<PermissionRoute requiredPermissions={["analytics.market.view"]}><div>REPORT_ONLY</div></PermissionRoute>} />
    <Route path="/403" element={<div>DENIED</div>} />
  </Routes></MemoryRouter>);
  return mounted.container;
}
describe("market reviewer navigation isolation", () => {
  it("redirects reviewer away from edit routes despite accidental extra permissions", () => {
    const view = renderAt("/users", ["analytics.market.view", "analytics.market.readonly", "user.manage"]);
    expect(view.textContent).toContain("REPORT_ONLY"); expect(view.textContent).not.toContain("USER_EDITOR");
  });
  it("permits the report route", () => expect(renderAt("/analytics/market", ["analytics.market.view", "analytics.market.readonly"]).textContent).toContain("REPORT_ONLY"));
  it("keeps ordinary administrator navigation working", () => expect(renderAt("/users", ["user.manage"]).textContent).toContain("USER_EDITOR"));
  it("preserves ordinary permission denial", () => expect(renderAt("/users", []).textContent).toContain("DENIED"));
});
