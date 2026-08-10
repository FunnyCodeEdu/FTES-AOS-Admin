import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { coreClient } from "../../../shared/api/client";
import { graphqlRequest } from "../../../shared/api/graphql";
import { useCreateEvent, useEvents, toEventStatus, type CreateEventInput } from "./events.api";
import { createTestQueryClient, renderHook, waitFor } from "../../../shared/testing/hookHarness";

vi.mock("../../../shared/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../shared/api/client")>();
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
    coreClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

vi.mock("../../../shared/api/graphql", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../shared/api/graphql")>();
  return { ...actual, graphqlRequest: vi.fn() };
});

const core = coreClient as unknown as Record<"get" | "post" | "patch" | "delete", ReturnType<typeof vi.fn>>;
const gql = graphqlRequest as unknown as ReturnType<typeof vi.fn>;

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

// ---------------------------------------------------------------- status BE ↔ FE
// Gốc của "0 nút trong khối Can(event.manage)": resolver BE trả status NGUYÊN VĂN CHỮ HOA
// (AdminContentReadController#adminEvent chuẩn hoá `mode` nhưng bỏ sót `status`), còn FE so chữ
// thường. Cast `as` cũ không sinh mã runtime nên "DRAFT" lọt thẳng vào component.

describe("toEventStatus — biên dịch status BE → domain FE", () => {
  it("map đủ 6 trạng thái BE có thật về chữ thường", () => {
    expect(toEventStatus("DRAFT")).toBe("draft");
    expect(toEventStatus("PENDING_APPROVAL")).toBe("pending_approval");
    expect(toEventStatus("PUBLISHED")).toBe("published");
    expect(toEventStatus("ONGOING")).toBe("ongoing");
    expect(toEventStatus("ENDED")).toBe("ended");
    expect(toEventStatus("CANCELLED")).toBe("cancelled");
  });

  it("KHÔNG bao giờ sinh ra 'completed' — trạng thái đó không tồn tại ở BE", () => {
    const beStatuses = ["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "ONGOING", "ENDED", "CANCELLED"];
    expect(beStatuses.map(toEventStatus)).not.toContain("completed");
  });

  it("giá trị lạ → fallback 'draft' nhưng PHẢI cảnh báo, không nuốt im lặng", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(toEventStatus("SOMETHING_NEW")).toBe("draft");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("useEvents — status đi qua mapper, filter đi ngược lên CHỮ HOA", () => {
  function mockPage(status: string) {
    gql.mockResolvedValue({
      adminEvents: {
        items: [{ id: "e1", type: "WEBINAR", title: "Sự kiện", status, startAt: "2026-09-01T10:00:00Z" }],
        total: 1,
        page: 0,
        size: 10,
      },
    });
  }

  it("status CHỮ HOA của BE được hạ về domain FE (không còn cast trần)", async () => {
    mockPage("DRAFT");
    const h = renderHook(() => useEvents(), createTestQueryClient());
    await waitFor(() => expect(h.result.current.data?.items[0].status).toBe("draft"));
    h.unmount();
  });

  // EventRepository.searchAdmin so khớp NGUYÊN VĂN (`e.status = :status`) trên dữ liệu CHỮ HOA,
  // nên filter chữ thường trước nay luôn trả 0 dòng.
  it("filter status/type được upper-case trước khi gửi lên BE", async () => {
    mockPage("PUBLISHED");
    const h = renderHook(
      () => useEvents({ status: "pending_approval", type: "webinar" }),
      createTestQueryClient()
    );
    await waitFor(() => expect(gql).toHaveBeenCalled());
    const variables = gql.mock.calls[0][1] as { filter: Record<string, unknown> };
    expect(variables.filter).toMatchObject({ status: "PENDING_APPROVAL", type: "WEBINAR" });
    h.unmount();
  });
});
