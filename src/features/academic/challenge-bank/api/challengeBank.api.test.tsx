import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { ApiError, coreClient } from "../../../../shared/api/client";
import { handleAdminMutationError } from "../../../../shared/api/errors";
import {
  useCourseChallengeBank,
  useSetChallengeVisibility,
  type BankChallenge,
} from "./challengeBank.api";
import { challengeBankKeys } from "./challengeBank.keys";
import {
  createTestQueryClient,
  flush,
  renderHook,
  waitFor,
} from "../../../../shared/testing/hookHarness";

// Nợ quality-loop admin-course-challenge-bank 1.3 (phần unit): key/enabled của query kho,
// invalidate sau toggle visibility, lỗi BE đi qua handleAdminMutationError (map
// CHALLENGE_INVALID_STATE test ở shared/api/errors.test.ts — cùng bảng ADMIN_ERROR_MESSAGES).

vi.mock("../../../../shared/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../shared/api/client")>();
  return {
    ...actual,
    coreClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

vi.mock("../../../../shared/api/errors", () => ({
  handleAdminMutationError: vi.fn(),
  adminErrorMessage: vi.fn(() => ""),
}));

const core = coreClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

const row: BankChallenge = {
  id: "ch-1",
  title: "Thử thách SQL cơ bản",
  slug: "thu-thach-sql-co-ban",
  type: "SQL",
  status: "PUBLISHED",
  visibility: "COURSE_ONLY",
  courseId: "c-1",
  lessonId: null,
  startsAt: null,
  endsAt: null,
  updatedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("challengeBankKeys", () => {
  it("key kho theo course: ['admin','challenge-bank',courseId]", () => {
    expect(challengeBankKeys.course("c-1")).toEqual(["admin", "challenge-bank", "c-1"]);
  });
});

describe("useCourseChallengeBank", () => {
  it("courseId undefined → query DISABLED, không bắn request", async () => {
    const qc = createTestQueryClient();
    const h = renderHook(() => useCourseChallengeBank(undefined), qc);
    await flush();
    expect(core.get).not.toHaveBeenCalled();
    expect(h.result.current.fetchStatus).toBe("idle");
    h.unmount();
  });

  it("có courseId → GET /admin/challenges?courseId= và trả rows", async () => {
    core.get.mockResolvedValue({ data: [row] });
    const qc = createTestQueryClient();
    const h = renderHook(() => useCourseChallengeBank("c-1"), qc);
    await waitFor(() => expect(h.result.current.data).toEqual([row]));
    expect(core.get).toHaveBeenCalledWith("/admin/challenges", {
      params: { courseId: "c-1" },
    });
    h.unmount();
  });
});

describe("useSetChallengeVisibility", () => {
  it("POST /admin/challenges/{id}/visibility {visibility} + invalidate kho của course", async () => {
    core.post.mockResolvedValue({ data: { ...row, visibility: "WORKSPACE_PUBLIC" } });
    const qc = createTestQueryClient();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const h = renderHook(() => useSetChallengeVisibility("c-1"), qc);

    await act(async () => {
      await h.result.current.mutateAsync({ id: "ch-1", visibility: "WORKSPACE_PUBLIC" });
    });

    expect(core.post).toHaveBeenCalledWith("/admin/challenges/ch-1/visibility", {
      visibility: "WORKSPACE_PUBLIC",
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: challengeBankKeys.course("c-1") });
    h.unmount();
  });

  it("BE trả CHALLENGE_INVALID_STATE → lỗi đi qua handleAdminMutationError (map message)", async () => {
    const err = new ApiError(400, "Bad Request", false, "CHALLENGE_INVALID_STATE");
    core.post.mockRejectedValue(err);
    const qc = createTestQueryClient();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const h = renderHook(() => useSetChallengeVisibility("c-1"), qc);

    await act(async () => {
      await expect(
        h.result.current.mutateAsync({ id: "ch-1", visibility: "WORKSPACE_PUBLIC" })
      ).rejects.toBe(err);
    });

    expect(vi.mocked(handleAdminMutationError).mock.calls[0]?.[0]).toBe(err);
    expect(spy).not.toHaveBeenCalled(); // fail thì không invalidate
    h.unmount();
  });
});
