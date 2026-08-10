import { describe, expect, it, vi } from "vitest";
import { renderHook } from "../testing/hookHarness";

// Gate SUPER_ADMIN: engine BE bypass ở EffectivePermissions.allows() nhưng permissionCodes() —
// nguồn của me.permissions — KHÔNG đọc cờ đó, nên SUPER_ADMIN thuần có danh sách quyền RỖNG.
// Nếu <Can> chỉ gate bằng Set.has thì tài khoản quyền cao nhất lại là tài khoản không thấy gì.
// Đây cũng là bản vá có rủi ro nới quyền cao nhất trong loạt này nên phải có ca đối chứng: ADMIN
// thường KHÔNG được hưởng bypass.

window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia;

const { useMeMock } = vi.hoisted(() => ({ useMeMock: vi.fn() }));
vi.mock("../../features/auth/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../features/auth/api")>();
  return { ...actual, useMe: useMeMock };
});

const { Can } = await import("./Can");

interface MeStub {
  permissions: string[];
  scopedGrants: never[];
  superAdmin: boolean;
}

function mockMe(me: Partial<MeStub>) {
  useMeMock.mockReturnValue({
    data: { permissions: [], scopedGrants: [], superAdmin: false, ...me },
  });
}

/** Render <Can> và trả về nhánh đã chọn ("ALLOWED" hay "DENIED"). */
function branchFor(permissions: string[]): string {
  const h = renderHook(() =>
    Can({ permissions, children: "ALLOWED", fallback: "DENIED" })
  );
  const element = h.result.current as { props: { children: string } };
  const branch = element.props.children;
  h.unmount();
  return branch;
}

describe("<Can> — bypass SUPER_ADMIN", () => {
  it("SUPER_ADMIN thuần (permissions RỖNG) vẫn thấy UI gate bằng leaf chỉ họ dùng được", () => {
    mockMe({ permissions: [], superAdmin: true });
    expect(branchFor(["admin.rbac.grant"])).toBe("ALLOWED");
  });

  it("ADMIN thường KHÔNG có quyền thì vẫn bị chặn — bypass không rò sang người khác", () => {
    mockMe({ permissions: ["course.manage"], superAdmin: false });
    expect(branchFor(["admin.rbac.grant"])).toBe("DENIED");
  });

  it("ADMIN thường có đúng leaf thì qua như cũ (không hồi quy đường thường)", () => {
    mockMe({ permissions: ["event.manage"], superAdmin: false });
    expect(branchFor(["event.manage"])).toBe("ALLOWED");
  });

  it("cờ superAdmin vắng mặt (BE cũ / lỗi surface) được coi là KHÔNG phải super admin", () => {
    useMeMock.mockReturnValue({ data: { permissions: [], scopedGrants: [] } });
    expect(branchFor(["event.manage"])).toBe("DENIED");
  });
});
