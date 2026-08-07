import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { coreClient } from "../../../shared/api/client";
import { useCreateEvent } from "./events.api";
import { createTestQueryClient, renderHook } from "../../../shared/testing/hookHarness";
import type { CreateEventInput } from "../shared/types";

vi.mock("../../../shared/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../shared/api/client")>();
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
    coreClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

const core = coreClient as unknown as Record<"get" | "post" | "patch" | "delete", ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
});

// admin-event-create-repair §2 — wizard nói chữ thường (webinar/offline) còn DB nói CHỮ HOA và
// KHÔNG có "OFFLINE". Chuẩn hoá nằm ở biên API, và đây là lưới bắt nếu ai đó đổi ngược lại:
// sai một trong hai giá trị là CHECK constraint từ chối, hiện ra thành 500 chứ không phải lỗi rõ ràng.

/** Input tối thiểu của wizard; từng test ghi đè phần mình quan tâm. */
const baseInput: CreateEventInput = {
  type: "webinar",
  title: "Webinar thử",
  schedule: { startAt: "2026-09-01T10:00:00.000Z", endAt: "2026-09-01T12:00:00.000Z" },
  mode: "online",
  onlineLink: "https://meet.google.com/abc-defg-hij",
};

/** Chạy useCreateEvent với input cho trước, trả về body thực sự POST lên BE. */
async function bodySentFor(input: CreateEventInput): Promise<Record<string, unknown>> {
  core.post.mockResolvedValue({ data: { id: "e1" } });
  const h = renderHook(() => useCreateEvent(), createTestQueryClient());
  await act(async () => {
    await h.result.current.mutateAsync(input);
  });
  expect(core.post).toHaveBeenCalledWith("/event/admin/events", expect.anything());
  return core.post.mock.calls[0][1] as Record<string, unknown>;
}

describe("useCreateEvent — từ vựng gửi lên BE", () => {
  it("type upper-case về đúng tập CHECK của DB", async () => {
    expect(await bodySentFor(baseInput)).toMatchObject({ type: "WEBINAR" });
    vi.clearAllMocks();
    expect(await bodySentFor({ ...baseInput, type: "workshop" })).toMatchObject({
      type: "WORKSHOP",
    });
  });

  it("online → ONLINE, venue là link họp", async () => {
    expect(await bodySentFor(baseInput)).toMatchObject({
      locationType: "ONLINE",
      venue: "https://meet.google.com/abc-defg-hij",
    });
  });

  it("offline → ONSITE (KHÔNG phải OFFLINE), venue là địa điểm vật lý", async () => {
    const body = await bodySentFor({
      ...baseInput,
      mode: "offline",
      onlineLink: undefined,
      location: "Hội trường A, 123 Nguyễn Huệ",
    });
    expect(body).toMatchObject({
      locationType: "ONSITE",
      venue: "Hội trường A, 123 Nguyễn Huệ",
    });
  });

  it("KHÔNG trường nào của body mang giá trị 'OFFLINE'", async () => {
    // Bắt cả trường hợp ai đó thêm field mới rồi vô tình dùng lại từ vựng cũ.
    const body = await bodySentFor({ ...baseInput, mode: "offline", location: "Phòng 302" });
    expect(Object.values(body)).not.toContain("OFFLINE");
  });

  it("giữ nguyên hai mốc thời gian ISO-8601 mà BE bắt buộc", async () => {
    expect(await bodySentFor(baseInput)).toMatchObject({
      startAt: "2026-09-01T10:00:00.000Z",
      endAt: "2026-09-01T12:00:00.000Z",
    });
  });
});
