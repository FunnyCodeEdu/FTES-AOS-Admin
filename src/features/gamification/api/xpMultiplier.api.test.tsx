import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { coreClient } from "../../../shared/api/client";
import {
  useActivateXpMultiplierEvent,
  useDeactivateXpMultiplierEvent,
  useUpsertXpMultiplierEvent,
  useXpMultiplierEvents,
} from "./gamification.api";
import type { XpMultiplierEvent } from "./gamification.api";
import { createTestQueryClient, renderHook, waitFor } from "../../../shared/testing/hookHarness";

// change quest-xp-multiplier — GHIM HỢP ĐỒNG DÂY với BE `XpMultiplierAdminController`.
// Điều đáng ghim nhất ở đây không phải "gọi đúng URL" mà là VÒNG ĐỜI HAI BƯỚC: body tạo/sửa KHÔNG
// mang `active` (lưu không bao giờ là bật), và body bật PHẢI nhắc lại hệ số + khung thời gian.
// Gửi thiếu một trong hai thứ đó thì BE trả 400 và tính năng câm ở đúng chỗ nguy hiểm nhất.

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
};

const event: XpMultiplierEvent = {
  id: "e-1",
  code: "CAY-QUEST-T1",
  title: "Tuần lễ cày quest",
  multiplier: 2,
  startsAt: "2026-09-01T00:00:00Z",
  endsAt: "2026-09-08T00:00:00Z",
  active: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useXpMultiplierEvents", () => {
  it("GET danh sách kèm TRẦN hệ số của BE (FE không tự chế trần)", async () => {
    core.get.mockResolvedValue({ data: { events: [event], maxMultiplier: 5 } });
    const qc = createTestQueryClient();
    const h = renderHook(() => useXpMultiplierEvents(), qc);

    await waitFor(() => expect(h.result.current.isSuccess).toBe(true));

    expect(core.get).toHaveBeenCalledWith("/gamification/admin/xp-multiplier-events");
    expect(h.result.current.data?.maxMultiplier).toBe(5);
    expect(h.result.current.data?.events).toHaveLength(1);
    h.unmount();
  });
});

describe("useUpsertXpMultiplierEvent — lưu KHÔNG BAO GIỜ là bật", () => {
  it("body không mang field active (BE luôn ra bản nháp)", async () => {
    core.post.mockResolvedValue({ data: event });
    const qc = createTestQueryClient();
    const h = renderHook(() => useUpsertXpMultiplierEvent(), qc);

    await act(async () => {
      await h.result.current.mutateAsync({
        code: event.code,
        title: event.title,
        multiplier: 1.5,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
      });
    });

    const [url, body] = core.post.mock.calls[0];
    expect(url).toBe("/gamification/admin/xp-multiplier-events");
    expect(body).not.toHaveProperty("active");
    expect(body.multiplier).toBe(1.5);
    h.unmount();
  });
});

describe("useActivateXpMultiplierEvent — xác nhận đi kèm request, không chỉ nằm ở hộp thoại", () => {
  it("POST /{code}/activate mang đủ hệ số + hai mốc thời gian + lý do", async () => {
    core.post.mockResolvedValue({ data: { ...event, active: true } });
    const qc = createTestQueryClient();
    const h = renderHook(() => useActivateXpMultiplierEvent(), qc);

    await act(async () => {
      await h.result.current.mutateAsync({
        code: event.code,
        confirm: {
          confirmMultiplier: event.multiplier,
          confirmStartsAt: event.startsAt,
          confirmEndsAt: event.endsAt,
          reason: "đợt khuyến khích học đầu kỳ",
        },
      });
    });

    const [url, body] = core.post.mock.calls[0];
    expect(url).toBe("/gamification/admin/xp-multiplier-events/CAY-QUEST-T1/activate");
    expect(body).toEqual({
      confirmMultiplier: 2,
      confirmStartsAt: "2026-09-01T00:00:00Z",
      confirmEndsAt: "2026-09-08T00:00:00Z",
      reason: "đợt khuyến khích học đầu kỳ",
    });
    h.unmount();
  });

  it("code có ký tự lạ được encode (không vỡ path)", async () => {
    core.post.mockResolvedValue({ data: event });
    const qc = createTestQueryClient();
    const h = renderHook(() => useDeactivateXpMultiplierEvent(), qc);

    await act(async () => {
      await h.result.current.mutateAsync({ code: "he/2026", reason: "dừng sớm" });
    });

    expect(core.post.mock.calls[0][0]).toBe(
      "/gamification/admin/xp-multiplier-events/he%2F2026/deactivate"
    );
    expect(core.post.mock.calls[0][1]).toEqual({ reason: "dừng sớm" });
    h.unmount();
  });
});
