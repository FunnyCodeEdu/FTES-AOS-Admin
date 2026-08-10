import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { coreClient } from "../../../shared/api/client";
import { graphqlRequest } from "../../../shared/api/graphql";
import {
  useCreateEvent,
  useEvent,
  useEvents,
  useReviewEvent,
  useUpdateEvent,
  toEventStatus,
  type CreateEventInput,
} from "./events.api";
import { apiClient } from "../../../shared/api/client";
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

// ---------------------------------------------------------------- duyệt event
// Mắt xích cuối của publish. Trước đây caller duy nhất nằm ở /community/events (đã xoá ở change
// admin-event-create-repair) nên endpoint mất người gọi và KHÔNG publish được event qua giao diện.

describe("useReviewEvent — duyệt event chờ phê duyệt", () => {
  const admin = apiClient as unknown as Record<"post", ReturnType<typeof vi.fn>>;

  async function review(input: Parameters<ReturnType<typeof useReviewEvent>["mutateAsync"]>[0]) {
    admin.post.mockResolvedValue({ data: null });
    const h = renderHook(() => useReviewEvent(), createTestQueryClient());
    await act(async () => {
      await h.result.current.mutateAsync(input);
    });
    return admin.post.mock.calls[0];
  }

  it("APPROVE gửi đúng đường /events/{id}/review qua apiClient (base /api/v1/admin)", async () => {
    const [url, body] = await review({ id: "e1", decision: "APPROVE" });
    expect(url).toBe("/events/e1/review");
    expect(body).toMatchObject({ decision: "APPROVE" });
  });

  it("REJECT mang theo lý do — BE bắt buộc (AdminCommandHelper.requireReason)", async () => {
    const [, body] = await review({ id: "e1", decision: "REJECT", reason: "Thiếu thông tin" });
    expect(body).toMatchObject({ decision: "REJECT", reason: "Thiếu thông tin" });
  });

  it("KHÔNG đi qua coreClient — submit/cancel và review nằm ở hai module BE khác nhau", async () => {
    await review({ id: "e1", decision: "APPROVE" });
    expect(core.post).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------- sửa sự kiện
// event-edit-ui §1. Hai thứ dễ hỏng nhất và không có gì khác bắt được:
// (a) từ vựng gửi lên — sai `type` hoa/thường hoặc viết "OFFLINE" là CHECK constraint từ chối, hiện
//     ra thành 500 chứ không phải lỗi rõ ràng (đúng vết xe đổ của đường tạo);
// (b) tính PARTIAL — PATCH mà gửi cả những field không đổi thì mọi lần lưu đều ghi đè, và riêng
//     `locationType` còn âm thầm hạ sự kiện HYBRID xuống ONLINE/ONSITE.

describe("useUpdateEvent — PATCH partial cho sự kiện đã tạo", () => {
  const admin = apiClient as unknown as Record<"post" | "patch", ReturnType<typeof vi.fn>>;

  /** Mốc "trước khi sửa": đúng những gì form đang hiện. */
  const previous: CreateEventInput = { ...baseInput };

  async function patchFor(next: CreateEventInput, from: CreateEventInput = previous) {
    core.patch.mockResolvedValue({ data: null });
    const h = renderHook(() => useUpdateEvent(), createTestQueryClient());
    await act(async () => {
      await h.result.current.mutateAsync({ id: "e1", next, previous: from });
    });
    const [url, body] = core.patch.mock.calls[0] ?? [undefined, {}];
    return { url: url as string | undefined, body: (body ?? {}) as Record<string, unknown> };
  }

  it("gửi PATCH /event/admin/events/{id} qua coreClient, KHÔNG qua apiClient", async () => {
    const { url } = await patchFor({ ...previous, title: "Tiêu đề mới" });
    expect(url).toBe("/event/admin/events/e1");
    // apiClient có base /api/v1/admin — module khác hẳn; đi nhầm client là 404/403 chứ không phải 200.
    expect(admin.patch).not.toHaveBeenCalled();
    expect(admin.post).not.toHaveBeenCalled();
  });

  it("type đổi thì gửi CHỮ HOA đúng tập CHECK của DB", async () => {
    const { body } = await patchFor({ ...previous, type: "workshop" });
    expect(body).toMatchObject({ type: "WORKSHOP" });
  });

  it("đổi sang offline → ONSITE (KHÔNG phải OFFLINE), venue là địa điểm vật lý", async () => {
    const { body } = await patchFor({
      ...previous,
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
    const { body } = await patchFor({
      ...previous,
      mode: "offline",
      onlineLink: undefined,
      location: "Phòng 302",
    });
    expect(Object.values(body)).not.toContain("OFFLINE");
  });

  it("không đổi gì thì KHÔNG bắn request — PATCH không phải PUT", async () => {
    // Trước đây gửi body rỗng; nhưng BE vẫn save() + phát event.updated (outbox + reindex) cho một
    // thao tác không đổi gì, còn UI báo "đã lưu" sai sự thật. Nay chặn ngay ở client.
    await patchFor({ ...previous });
    expect(core.patch).not.toHaveBeenCalled();
  });

  it("chỉ đổi tiêu đề thì body chỉ có tiêu đề — không kèm type/venue/thời gian", async () => {
    const { body } = await patchFor({ ...previous, title: "Tiêu đề mới" });
    expect(Object.keys(body)).toEqual(["title"]);
    expect(body).toMatchObject({ title: "Tiêu đề mới" });
  });

  it("null KHÔNG được dùng để đánh dấu 'không đổi' — field không đổi phải VẮNG MẶT", async () => {
    const { body } = await patchFor({ ...previous, capacity: 120 });
    expect(Object.values(body)).not.toContain(null);
    expect(Object.keys(body)).toEqual(["capacity"]);
  });

  it("cùng một mốc thời gian viết khác định dạng KHÔNG tính là đổi", async () => {
    // BE trả "…T10:00:00Z", dayjs.toISOString() cho "…T10:00:00.000Z" — so chuỗi thì lần lưu nào
    // cũng gửi thừa startAt/endAt dù người dùng không đụng tới lịch.
    await patchFor(
      { ...previous, schedule: { startAt: "2026-09-01T10:00:00.000Z", endAt: "2026-09-01T12:00:00.000Z" } },
      { ...previous, schedule: { startAt: "2026-09-01T10:00:00Z", endAt: "2026-09-01T12:00:00Z" } }
    );
    expect(core.patch).not.toHaveBeenCalled();
  });

  it("đổi giờ thật thì gửi đúng mốc mới", async () => {
    const { body } = await patchFor({
      ...previous,
      schedule: { startAt: "2026-09-02T10:00:00.000Z", endAt: "2026-09-02T12:00:00.000Z" },
    });
    expect(body).toMatchObject({
      startAt: "2026-09-02T10:00:00.000Z",
      endAt: "2026-09-02T12:00:00.000Z",
    });
  });
});

// Prefill của form sửa lấy `type` từ `useEvent`; BE trả CHỮ HOA còn Select dùng option chữ thường,
// nên thiếu bước hạ chữ thường là ô "Loại" mở ra trống trơn.
describe("useEvent — type về đúng từ vựng của form", () => {
  it("WORKSHOP của BE thành 'workshop' trong state", async () => {
    gql.mockResolvedValue({
      adminEvent: {
        id: "e1",
        type: "WORKSHOP",
        title: "Sự kiện",
        status: "DRAFT",
        mode: "online",
        startAt: "2026-09-01T10:00:00Z",
        endAt: "2026-09-01T12:00:00Z",
      },
    });
    const h = renderHook(() => useEvent("e1"), createTestQueryClient());
    await waitFor(() => expect(h.result.current.data?.type).toBe("workshop"));
    h.unmount();
  });
});

// Hai lỗi bản soi bắt được sau lượt vá đầu.
describe("useUpdateEvent — bỏ trắng sức chứa và body rỗng", () => {
  const core2 = coreClient as unknown as Record<"patch", ReturnType<typeof vi.fn>>;

  async function patchWith(nextOverride: Partial<CreateEventInput>) {
    core2.patch.mockResolvedValue({ data: null });
    const previous = { ...baseInput, capacity: 120 };
    const h = renderHook(() => useUpdateEvent(), createTestQueryClient());
    await act(async () => {
      await h.result.current.mutateAsync({ id: "e1", next: { ...previous, ...nextOverride }, previous });
    });
    return core2.patch.mock.calls;
  }

  it("xoá trắng ô sức chứa (antd trả null) KHÔNG gửi capacity", async () => {
    // antd InputNumber phát null chứ không phải undefined — `!== undefined` không chặn được.
    const calls = await patchWith({ capacity: null as unknown as number });
    expect(calls).toHaveLength(0);
  });

  it("không đổi gì thì KHÔNG bắn request", async () => {
    expect(await patchWith({})).toHaveLength(0);
  });

  it("có đổi thật thì vẫn bắn, và chỉ mang field đã đổi", async () => {
    const calls = await patchWith({ title: "Tên mới" });
    expect(calls).toHaveLength(1);
    expect(Object.keys(calls[0][1] as object)).toEqual(["title"]);
  });
});
