import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { ApiError, coreClient } from "../../../shared/api/client";
import { handleAdminMutationError } from "../../../shared/api/errors";
import {
  useAddRewardPoolItem,
  useCloseSeason,
  usePatchQuest,
  useQuests,
  useUpsertQuest,
  useValidateRewardPool,
} from "./gamification.api";
import type { Quest, QuestUpsertRequest } from "./gamification.api";
import { gamificationKeys } from "./gamification.keys";
import {
  createTestQueryClient,
  renderHook,
  waitFor,
} from "../../../shared/testing/hookHarness";

// Nợ quality-loop admin-gamification-console 1.2/2.4/4.3 (phần unit): endpoint + payload +
// invalidate key + notification lỗi của module API. coreClient được mock (interceptor thật đã
// unwrap envelope → res.data là payload); handleAdminMutationError mock để không render antd
// notification trong jsdom.

vi.mock("../../../shared/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../shared/api/client")>();
  return {
    ...actual,
    coreClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

vi.mock("../../../shared/api/errors", () => ({
  handleAdminMutationError: vi.fn(),
  adminErrorMessage: vi.fn(() => ""),
}));

const core = coreClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const quest: Quest = {
  id: "q-1",
  code: "daily-checkin",
  title: "Điểm danh mỗi ngày",
  description: null,
  rewardCoin: 50,
  targetCount: 1,
  dailyLimit: 1,
  triggerEventType: "USER_CHECKIN",
  conditionJson: null,
  active: true,
  sortOrder: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useQuests", () => {
  it("GET /gamification/admin/quests và trả payload đã unwrap", async () => {
    core.get.mockResolvedValue({ data: [quest] });
    const qc = createTestQueryClient();
    const h = renderHook(() => useQuests(), qc);
    await waitFor(() => expect(h.result.current.data).toEqual([quest]));
    expect(core.get).toHaveBeenCalledWith("/gamification/admin/quests");
    h.unmount();
  });
});

describe("usePatchQuest — inline edit / toggle từ bảng", () => {
  it("PATCH bán phần: body CHỈ chứa field bị đổi (không clobber record), invalidate quests", async () => {
    core.patch.mockResolvedValue({ data: { ...quest, rewardCoin: 80 } });
    const qc = createTestQueryClient();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const h = renderHook(() => usePatchQuest(), qc);

    await act(async () => {
      await h.result.current.mutateAsync({ code: quest.code, patch: { rewardCoin: 80 } });
    });

    // Đúng 1 field trong body — toHaveBeenCalledWith so deep-equal nên field thừa sẽ fail.
    expect(core.patch).toHaveBeenCalledWith("/gamification/admin/quests/daily-checkin", {
      rewardCoin: 80,
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: gamificationKeys.quests() });
    h.unmount();
  });

  it("code có ký tự lạ được encode ở path", async () => {
    core.patch.mockResolvedValue({ data: quest });
    const qc = createTestQueryClient();
    const h = renderHook(() => usePatchQuest(), qc);

    await act(async () => {
      await h.result.current.mutateAsync({ code: "daily/checkin", patch: { active: false } });
    });

    expect(core.patch).toHaveBeenCalledWith("/gamification/admin/quests/daily%2Fcheckin", {
      active: false,
    });
    h.unmount();
  });

  it("BE từ chối → handleAdminMutationError nhận đúng lỗi (notification)", async () => {
    const err = new ApiError(400, "GAMIFICATION_INVALID_CONFIG");
    core.patch.mockRejectedValue(err);
    const qc = createTestQueryClient();
    const h = renderHook(() => usePatchQuest(), qc);

    await act(async () => {
      await expect(
        h.result.current.mutateAsync({ code: quest.code, patch: { rewardCoin: 5000 } })
      ).rejects.toBe(err);
    });

    expect(vi.mocked(handleAdminMutationError).mock.calls[0]?.[0]).toBe(err);
    h.unmount();
  });
});

describe("useUpsertQuest — QuestFormModal tạo/sửa đủ field", () => {
  it("POST record ĐẦY ĐỦ lên /quests (upsert theo code) + invalidate quests", async () => {
    const body: QuestUpsertRequest = {
      code: quest.code,
      title: quest.title,
      description: null,
      rewardCoin: 60,
      targetCount: 1,
      dailyLimit: 1,
      triggerEventType: quest.triggerEventType,
      conditionJson: '{"minDays":3}',
      active: true,
      sortOrder: 0,
    };
    core.post.mockResolvedValue({ data: { ...quest, rewardCoin: 60 } });
    const qc = createTestQueryClient();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const h = renderHook(() => useUpsertQuest(), qc);

    await act(async () => {
      await h.result.current.mutateAsync(body);
    });

    expect(core.post).toHaveBeenCalledWith("/gamification/admin/quests", body);
    expect(spy).toHaveBeenCalledWith({ queryKey: gamificationKeys.quests() });
    h.unmount();
  });
});

describe("useCloseSeason", () => {
  it("POST /gamification/admin/seasons/{id}/close + invalidate seasons", async () => {
    core.post.mockResolvedValue({ data: { id: "s-1", code: "S1", status: "PENDING_CLOSE" } });
    const qc = createTestQueryClient();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const h = renderHook(() => useCloseSeason(), qc);

    await act(async () => {
      await h.result.current.mutateAsync("s-1");
    });

    expect(core.post).toHaveBeenCalledWith("/gamification/admin/seasons/s-1/close");
    expect(spy).toHaveBeenCalledWith({ queryKey: gamificationKeys.seasons() });
    h.unmount();
  });
});

describe("reward pools — items + validate", () => {
  it("useAddRewardPoolItem POST item vào đúng pool + invalidate items của pool đó", async () => {
    const item = { rewardType: "COIN", amount: 100, badgeId: null, probability: 0.5, stock: null };
    core.post.mockResolvedValue({ data: { id: "i-1", poolId: "p-1", ...item } });
    const qc = createTestQueryClient();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const h = renderHook(() => useAddRewardPoolItem("p-1"), qc);

    await act(async () => {
      await h.result.current.mutateAsync(item);
    });

    expect(core.post).toHaveBeenCalledWith("/gamification/admin/reward-pools/p-1/items", item);
    expect(spy).toHaveBeenCalledWith({
      queryKey: gamificationKeys.rewardPoolItems("p-1"),
    });
    h.unmount();
  });

  it("useValidateRewardPool GET /reward-pools/{id}/validate, KHÔNG invalidate cache (chỉ đọc)", async () => {
    core.get.mockResolvedValue({ data: true });
    const qc = createTestQueryClient();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const h = renderHook(() => useValidateRewardPool(), qc);

    let ok: boolean | undefined;
    await act(async () => {
      ok = await h.result.current.mutateAsync("p-1");
    });

    expect(ok).toBe(true);
    expect(core.get).toHaveBeenCalledWith("/gamification/admin/reward-pools/p-1/validate");
    expect(spy).not.toHaveBeenCalled();
    h.unmount();
  });
});
