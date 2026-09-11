import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { coreClient } from "../../../shared/api/client";
import {
  createTestQueryClient,
  renderHook,
  waitFor,
} from "../../../shared/testing/hookHarness";
import { useMyEarningDetail } from "./payrollMe.api";

vi.mock("../../../shared/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../shared/api/client")>();
  return {
    ...actual,
    coreClient: { get: vi.fn(), post: vi.fn() },
  };
});

const core = coreClient as unknown as Record<"get" | "post", ReturnType<typeof vi.fn>>;

describe("useMyEarningDetail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("chỉ gọi endpoint /me theo id kỳ, không nhận instructorId từ client", async () => {
    core.get.mockResolvedValue({
      data: {
        id: "earning-1",
        instructorId: "instructor-from-server",
        orderContributions: [{ orderId: "order-1", instructorContribution: 120000 }],
      },
    });
    const client = createTestQueryClient();
    const hook = renderHook(() => useMyEarningDetail("earning-1"), client);

    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));

    expect(core.get).toHaveBeenCalledWith("/payroll/me/earnings/earning-1");
    expect(hook.result.current.data?.orderContributions[0].instructorContribution).toBe(120000);
    hook.unmount();
    await act(async () => client.clear());
  });

  it("không gọi API khi chưa có id kỳ lương", () => {
    const client = createTestQueryClient();
    const hook = renderHook(() => useMyEarningDetail(undefined), client);

    expect(hook.result.current.fetchStatus).toBe("idle");
    expect(core.get).not.toHaveBeenCalled();
    hook.unmount();
    client.clear();
  });
});
