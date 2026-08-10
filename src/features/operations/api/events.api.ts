import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, coreClient } from "../../../shared/api/client";
import { graphqlRequest } from "../../../shared/api/graphql";
import { handleAdminMutationError } from "../../../shared/api/errors";
import type {
  CertificateIssueResult,
  CheckInInfo,
  OfficialEvent,
  OfficialEventMode,
  OfficialEventStatus,
  OfficialEventType,
  PaginatedResponse,
  Registration,
} from "../shared/types";

/**
 * Biên dịch status BE → domain FE. BE canonical là CHỮ HOA (EventService §5.1: DRAFT →
 * PENDING_APPROVAL → PUBLISHED → ONGOING → ENDED; CANCELLED) còn component so chữ thường.
 *
 * Trước đây chỗ này là `item.status as OfficialEvent["status"]` — cast TypeScript KHÔNG sinh mã
 * runtime, nên "DRAFT" lọt thẳng vào `event.status === "draft"` và mọi điều kiện đều false ⇒ khối
 * hành động của EventDetailPage render rỗng với MỌI event, bất kể quyền. Resolver BE
 * (AdminContentReadController#adminEvent) có hạ chữ thường cho `mode` nhưng bỏ sót `status` ngay
 * trong cùng một lời gọi constructor, nên chuẩn hoá phải nằm ở đây.
 */
export function toEventStatus(raw: string): OfficialEventStatus {
  switch ((raw ?? "").toUpperCase()) {
    case "DRAFT":
      return "draft";
    case "PENDING_APPROVAL":
      return "pending_approval";
    case "PUBLISHED":
      return "published";
    case "ONGOING":
      return "ongoing";
    case "ENDED":
      return "ended";
    case "CANCELLED":
      return "cancelled";
    default:
      // Không nuốt im lặng: giá trị lạ = BE vừa thêm state mới mà FE chưa biết. Fallback "draft" chỉ
      // sai UX (có thể hiện nút Gửi duyệt sai ngữ cảnh); BE vẫn chặn vì submit chỉ đi từ DRAFT.
      console.warn(`[events.api] status event không nhận diện được: "${raw}" — tạm coi là draft`);
      return "draft";
  }
}

/**
 * Biên dịch NGƯỢC cho filter list. `EventRepository.searchAdmin` so khớp NGUYÊN VĂN
 * (`e.status = :status`, `e.type = :type`) trên dữ liệu CHỮ HOA, nên filter chữ thường của FE
 * trước nay luôn trả 0 dòng. Dùng chung cho cả status lẫn type (webinar → WEBINAR).
 */
function toBackendEnum(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * Chiều ngược lại, riêng cho `type`: BE lưu CHỮ HOA (CHECK `event_type`) còn FE dùng chữ thường làm
 * từ vựng hiển thị / query param / value của Select.
 *
 * Trước đây chỗ này là `item.type as OfficialEvent["type"]` — cast không sinh mã runtime nên
 * "WEBINAR" lọt thẳng vào state: bộ lọc "Loại" không round-trip, và form sửa sự kiện prefill giá trị
 * không khớp option nào. Giá trị ngoài picker (COMPETITION/MEETUP — DB cho phép) vẫn được hạ chữ
 * thường để hiển thị chứ không ép về "webinar".
 */
function toUiEventType(raw: string): OfficialEventType {
  return (raw ?? "").trim().toLowerCase() as OfficialEventType;
}

const ADMIN_EVENTS_QUERY = `query AdminEvents($filter: AdminEventFilter, $page: PageInput) {
  adminEvents(filter: $filter, page: $page) {
    items {
      id
      type
      title
      slug
      status
      startAt
      endAt
    }
    total
    page
    size
  }
}`;

const ADMIN_EVENT_QUERY = `query AdminEvent($id: ID!) {
  adminEvent(id: $id) {
    id
    type
    title
    slug
    description
    status
    startAt
    endAt
    mode
    capacity
    location
    onlineLink
    recordingUrl
    certificateConfig {
      enabled
      templateId
    }
    rewardConfig {
      enabled
      points
    }
    createdAt
  }
}`;

const ADMIN_EVENT_REGISTRATIONS_QUERY = `query AdminEventRegistrations($eventId: ID!, $filter: AdminEventRegistrationFilter, $page: PageInput) {
  adminEventRegistrations(eventId: $eventId, filter: $filter, page: $page) {
    items {
      id
      userId
      userName
      email
      checkedIn
      checkedInAt
      registeredAt
    }
    total
    page
    size
  }
}`;

const ADMIN_EVENT_CHECK_IN_QR_QUERY = `query AdminEventCheckInQr($eventId: ID!) {
  adminEventCheckInQr(eventId: $eventId) {
    qrToken
    expiresAt
  }
}`;

const queryKeys = {
  events: (params: Record<string, unknown>) => ["ops", "events", params] as const,
  event: (id: string) => ["ops", "events", id] as const,
  registrations: (eventId: string, params: Record<string, unknown>) => ["ops", "events", eventId, "registrations", params] as const,
  checkin: (eventId: string) => ["ops", "events", eventId, "checkin-qr"] as const,
};

let mockEvents: OfficialEvent[] = [
  {
    id: "evt-1",
    type: "webinar",
    title: "Webinar ôn thi đại học",
    description: "Chia sẻ chiến lược ôn thi.",
    schedule: { startAt: "2026-07-10T08:00:00Z", endAt: "2026-07-10T10:00:00Z" },
    mode: "online",
    capacity: 500,
    onlineLink: "https://meet.example.com/evt-1",
    certificateConfig: { enabled: true },
    rewardConfig: { enabled: true, points: 100 },
    status: "published",
    createdAt: "2026-07-01T00:00:00Z",
  },
];

export interface EventListParams {
  type?: OfficialEventType;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

const MOCK_ENABLED_EVENTS = false;

export function useEvents(params: EventListParams = {}) {
  return useQuery<PaginatedResponse<OfficialEvent>, Error>({
    queryKey: queryKeys.events(params as Record<string, unknown>),
    queryFn: async () => {
      if (MOCK_ENABLED_EVENTS) {
        void apiClient;
        let items = [...mockEvents];
        if (params.type) items = items.filter((e) => e.type === params.type);
        if (params.status) items = items.filter((e) => e.status === params.status);
        if (params.search) {
          const q = params.search.toLowerCase();
          items = items.filter((e) => e.title.toLowerCase().includes(q));
        }
        const page = params.page ?? 1;
        const pageSize = params.pageSize ?? 10;
        const start = (page - 1) * pageSize;
        return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
      }
      return graphqlRequest<{
        adminEvents: {
          items: Array<{
            id: string;
            type: string;
            title: string;
            slug?: string;
            status: string;
            startAt?: string;
            endAt?: string;
          }>;
          total: number;
          page: number;
          size: number;
        };
      }>(ADMIN_EVENTS_QUERY, {
        filter: {
          ...(params.search ? { q: params.search } : {}),
          ...(params.status ? { status: toBackendEnum(params.status) } : {}),
          ...(params.type ? { type: toBackendEnum(params.type) } : {}),
        },
        page: { page: Math.max(0, (params.page ?? 1) - 1), size: params.pageSize ?? 10 },
      }).then((r) => ({
        items: r.adminEvents.items.map((item) => ({
          id: item.id,
          type: toUiEventType(item.type),
          title: item.title,
          description: undefined,
          schedule: { startAt: item.startAt ?? "", endAt: item.endAt },
          mode: "online" as OfficialEvent["mode"],
          capacity: undefined,
          location: undefined,
          onlineLink: undefined,
          certificateConfig: undefined,
          rewardConfig: undefined,
          status: toEventStatus(item.status),
          recordingUrl: undefined,
          cancelledReason: undefined,
          createdAt: item.startAt ?? new Date().toISOString(),
        })),
        total: r.adminEvents.total,
        page: (r.adminEvents.page ?? 0) + 1,
        pageSize: r.adminEvents.size,
      }));
    },
  });
}

export function useEvent(id: string | undefined) {
  return useQuery<OfficialEvent, Error>({
    queryKey: queryKeys.event(id ?? ""),
    queryFn: async () => {
      return graphqlRequest<{
        adminEvent: {
          id: string;
          type: string;
          title: string;
          slug?: string;
          description?: string;
          status: string;
          startAt?: string;
          endAt?: string;
          mode: string;
          capacity?: number;
          location?: string;
          onlineLink?: string;
          recordingUrl?: string;
          certificateConfig?: { enabled: boolean; templateId?: string };
          rewardConfig?: { enabled: boolean; points?: number };
          createdAt?: string;
        } | null;
      }>(ADMIN_EVENT_QUERY, { id }).then((r) => {
        const item = r.adminEvent;
        if (!item) throw new Error("Event not found");
        return {
          id: item.id,
          type: toUiEventType(item.type),
          title: item.title,
          description: item.description,
          schedule: { startAt: item.startAt ?? "", endAt: item.endAt },
          mode: item.mode as OfficialEvent["mode"],
          capacity: item.capacity,
          location: item.location,
          onlineLink: item.onlineLink,
          certificateConfig: item.certificateConfig,
          rewardConfig: item.rewardConfig,
          status: toEventStatus(item.status),
          recordingUrl: item.recordingUrl,
          cancelledReason: undefined,
          createdAt: item.createdAt ?? item.startAt ?? new Date().toISOString(),
        };
      });
    },
    enabled: !!id,
  });
}

export interface CreateEventInput {
  type: OfficialEventType;
  title: string;
  description?: string;
  schedule: { startAt: string; endAt?: string };
  mode: OfficialEventMode;
  capacity?: number;
  location?: string;
  onlineLink?: string;
  certificateConfig?: { enabled: boolean; templateId?: string };
  rewardConfig?: { enabled: boolean; points?: number };
}

// slug ổn định, không phụ thuộc thời điểm gọi (không dùng Date.now()).
function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Hậu tố duy nhất suy ra TỪ title (deterministic), tránh trùng slug mà không dùng timestamp.
function stableSuffix(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h.toString(36).padStart(6, "0").slice(-6);
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation<OfficialEvent, Error, CreateEventInput>({
    mutationFn: async (input) => {
      // Map wizard FE → BE CreateEventRequest (rich endpoint core, không phải /admin).
      const body = {
        // CHECK event_type của DB chỉ nhận CHỮ HOA (WEBINAR/WORKSHOP/HACKATHON/...),
        // wizard giữ chữ thường → phải upper-case trước khi gửi.
        type: input.type.toUpperCase(),
        title: input.title,
        slug: `${slugify(input.title)}-${stableSuffix(input.title)}`,
        description: input.description,
        startAt: input.schedule.startAt,
        endAt: input.schedule.endAt,
        // CHECK location_type chỉ có ONSITE/ONLINE/HYBRID — offline map sang ONSITE (không phải OFFLINE).
        locationType: input.mode === "online" ? "ONLINE" : "ONSITE",
        // online → dùng link họp làm venue; offline → địa điểm vật lý.
        venue: input.mode === "online" ? input.onlineLink : input.location,
        capacity: input.capacity,
        // Defaults cho field BE yêu cầu nhưng wizard chưa thu thập:
        waitlistEnabled: false,
        checkinOpenBeforeMinutes: 30,
        attendanceMinMinutes: 0,
        rewardXp: input.rewardConfig?.points ?? 0,
        rewardCoin: 0, // wizard chỉ có points → map sang XP, coin = 0.
        certificateEnabled: input.certificateConfig?.enabled ?? false,
        // certificateConfig.templateId: BE chưa hỗ trợ → bỏ.
        // courseId: wizard chưa liên kết course → để trống.
        courseId: undefined,
      };
      const res = await coreClient.post("/event/admin/events", body);
      return res.data as OfficialEvent;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops", "events"] }),
    onError: handleAdminMutationError,
  });
}

export interface UpdateEventInput {
  id: string;
  /** Giá trị SAU khi sửa — nguyên vẹn từ form wizard. */
  next: CreateEventInput;
  /** Giá trị TRƯỚC khi sửa; chỉ dùng để loại field không đổi ra khỏi body PATCH. */
  previous: CreateEventInput;
}

/** Venue là MỘT cột ở BE: online → link họp, offline → địa chỉ vật lý (đúng quy ước của create). */
function venueOf(values: CreateEventInput): string | undefined {
  return values.mode === "online" ? values.onlineLink : values.location;
}

/**
 * So hai mốc thời gian theo THỜI ĐIỂM chứ không theo chuỗi: BE trả `"2026-09-01T10:00:00Z"` còn
 * `dayjs.toISOString()` cho `"2026-09-01T10:00:00.000Z"` — cùng một mốc mà khác chuỗi, so chuỗi thì
 * lần lưu nào cũng gửi thừa startAt/endAt dù người dùng không đụng tới lịch.
 */
function sameInstant(a?: string, b?: string): boolean {
  if (!a || !b) return a === b;
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  return Number.isNaN(ta) || Number.isNaN(tb) ? a === b : ta === tb;
}

/**
 * Dựng body PATCH partial: CHỈ field người dùng thực sự đổi mới có mặt.
 *
 * Field vắng mặt = "không đổi" (BE hiểu cả null lẫn absent như nhau) nên gửi thừa chỉ là nhiễu, và
 * nguy hiểm hơn: gửi lại `locationType` cho sự kiện HYBRID — hình thức mà wizard không có ô chọn —
 * sẽ âm thầm hạ nó xuống ONLINE/ONSITE. Vắng mặt thì HYBRID được giữ nguyên.
 *
 * Từ vựng gửi lên giống hệt create: `type` CHỮ HOA, `locationType` ∈ {ONLINE, ONSITE} — KHÔNG bao
 * giờ có "OFFLINE" (CHECK `location_type` chỉ nhận ONSITE/ONLINE/HYBRID).
 */
function buildUpdateEventBody(next: CreateEventInput, previous: CreateEventInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (next.type !== previous.type) body.type = next.type.toUpperCase();
  if (next.title !== previous.title) body.title = next.title;
  // Chuỗi rỗng là giá trị THẬT (xoá trắng mô tả), khác hẳn null/absent = không đổi.
  if (next.description !== previous.description) body.description = next.description ?? "";
  if (!sameInstant(next.schedule.startAt, previous.schedule.startAt)) body.startAt = next.schedule.startAt;
  if (!sameInstant(next.schedule.endAt, previous.schedule.endAt)) body.endAt = next.schedule.endAt;
  if (next.mode !== previous.mode) body.locationType = next.mode === "online" ? "ONLINE" : "ONSITE";
  const nextVenue = venueOf(next);
  if (nextVenue !== undefined && nextVenue !== venueOf(previous)) body.venue = nextVenue;
  // capacity bỏ trắng KHÔNG xoá được qua PATCH (null = không đổi theo hợp đồng BE) — giữ giá trị cũ
  // thay vì gửi null vô nghĩa. Dùng `!= null` (loose) chứ KHÔNG phải `!== undefined`: antd
  // InputNumber phát ra `null` khi ô bị xoá trắng, nên so với undefined thì null vẫn lọt qua và body
  // mang `capacity: null` — đúng thứ dòng comment này bảo là để tránh.
  if (next.capacity != null && next.capacity !== previous.capacity) body.capacity = next.capacity;
  return body;
}

/**
 * Sửa sự kiện đã tạo: `PATCH /api/v1/event/admin/events/{id}` — cùng module, cùng gate
 * `event.manage` (scoped EVENT) với submit/cancel/recording, nên đi qua `coreClient` (base
 * `/api/v1`) chứ KHÔNG phải `apiClient` (base `/api/v1/admin`, module admin — chỗ của `review`).
 */
export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpdateEventInput>({
    mutationFn: async ({ id, next, previous }) => {
      const body = buildUpdateEventBody(next, previous);
      // Không đổi gì thì đừng bắn request: BE vẫn sẽ save() + phát `event.updated` (kéo theo outbox
      // và reindex search) cho một thao tác rỗng, còn người dùng thì nhận toast "đã lưu" sai sự thật.
      if (Object.keys(body).length === 0) return;
      await coreClient.patch(`/event/admin/events/${id}`, body);
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["ops", "events", id] });
      qc.invalidateQueries({ queryKey: ["ops", "events"] });
    },
    onError: handleAdminMutationError,
  });
}

export interface TransitionEventInput {
  id: string;
  toStatus: OfficialEvent["status"];
  reason?: string;
}

export function useTransitionEvent() {
  const qc = useQueryClient();
  return useMutation<OfficialEvent, Error, TransitionEventInput>({
    mutationFn: async ({ id, toStatus }) => {
      // App chỉ có 2 admin action lên lifecycle event: submit-for-approval và cancel.
      // 'published' (đưa lên chờ duyệt) → submit; 'cancelled' → cancel.
      // 'ongoing'/'ended'/'draft' do scheduler BE điều khiển (EventEndProcessor), không phải admin
      // action; 'pending_approval' là KẾT QUẢ của /submit chứ không phải đích gọi được.
      if (toStatus === "published") {
        const res = await coreClient.post(`/event/admin/events/${id}/submit`);
        return res.data as OfficialEvent;
      }
      if (toStatus === "cancelled") {
        const res = await coreClient.post(`/event/admin/events/${id}/cancel`);
        return res.data as OfficialEvent;
      }
      throw new Error(`Transition sang "${toStatus}" không được hỗ trợ (chỉ submit/cancel).`);
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["ops", "events", id] });
      qc.invalidateQueries({ queryKey: ["ops", "events"] });
    },
    onError: handleAdminMutationError,
  });
}

/**
 * Duyệt event đang chờ: `POST /api/v1/admin/events/{id}/review` (module admin, gate
 * `admin.event.manage`) — approve đưa PENDING_APPROVAL → PUBLISHED, reject trả về DRAFT.
 *
 * Đây là mắt xích CUỐI của vòng đời publish: `/submit` chỉ đưa event lên chờ duyệt. Caller duy nhất
 * trước đây nằm ở trang `/community/events` đã xoá, nên endpoint mất người gọi và không còn đường nào
 * publish được event qua giao diện.
 *
 * Dùng `apiClient` (base `/api/v1/admin`) chứ KHÔNG phải `coreClient` như submit/cancel — hai nhóm
 * endpoint này nằm ở hai module BE khác nhau.
 */
export interface ReviewEventInput {
  id: string;
  decision: "APPROVE" | "REJECT";
  /** BE bắt buộc lý do khi từ chối (AdminCommandHelper.requireReason). */
  reason?: string;
}

export function useReviewEvent() {
  const qc = useQueryClient();
  return useMutation<void, Error, ReviewEventInput>({
    mutationFn: async ({ id, decision, reason }) => {
      await apiClient.post(`/events/${id}/review`, { decision, reason });
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["ops", "events", id] });
      qc.invalidateQueries({ queryKey: ["ops", "events"] });
    },
    onError: handleAdminMutationError,
  });
}

export interface RegistrationListParams {
  search?: string;
  checkedIn?: boolean;
  page?: number;
  pageSize?: number;
}

export function useRegistrations(eventId: string | undefined, params: RegistrationListParams = {}) {
  return useQuery<PaginatedResponse<Registration>, Error>({
    queryKey: queryKeys.registrations(eventId ?? "", params as Record<string, unknown>),
    queryFn: async () => {
      return graphqlRequest<{
        adminEventRegistrations: {
          items: Array<{
            id: string;
            userId: string;
            userName: string;
            email: string;
            checkedIn: boolean;
            checkedInAt?: string;
            registeredAt: string;
          }>;
          total: number;
          page: number;
          size: number;
        };
      }>(ADMIN_EVENT_REGISTRATIONS_QUERY, {
        eventId,
        filter: {
          ...(params.search ? { q: params.search } : {}),
          ...(params.checkedIn !== undefined ? { checkedIn: params.checkedIn } : {}),
        },
        page: { page: Math.max(0, (params.page ?? 1) - 1), size: params.pageSize ?? 20 },
      }).then((r) => ({
        items: r.adminEventRegistrations.items,
        total: r.adminEventRegistrations.total,
        page: (r.adminEventRegistrations.page ?? 0) + 1,
        pageSize: r.adminEventRegistrations.size,
      }));
    },
    enabled: !!eventId,
    refetchInterval: 15000,
  });
}

function csvEscape(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

// BE không có endpoint export CSV riêng (EventAdminController chỉ có /attendance roster);
// kéo toàn bộ registrations THẬT qua GraphQL adminEventRegistrations (paged) rồi build CSV client-side.
export function useExportRegistrations(eventId: string | undefined) {
  return async () => {
    if (!eventId) return;
    try {
      const size = 500;
      const rows: Registration[] = [];
      for (let page = 0; ; page += 1) {
        const r = await graphqlRequest<{
          adminEventRegistrations: { items: Registration[]; total: number };
        }>(ADMIN_EVENT_REGISTRATIONS_QUERY, {
          eventId,
          filter: {},
          page: { page, size },
        });
        rows.push(...r.adminEventRegistrations.items);
        if (
          r.adminEventRegistrations.items.length === 0 ||
          rows.length >= r.adminEventRegistrations.total
        ) {
          break;
        }
      }
      const csv = [
        "userId,userName,email,checkedIn,checkedInAt,registeredAt",
        ...rows.map((r) =>
          [r.userId, r.userName, r.email, r.checkedIn, r.checkedInAt ?? "", r.registeredAt]
            .map(csvEscape)
            .join(",")
        ),
      ].join("\n");
      // BOM để Excel mở đúng UTF-8 (tên user tiếng Việt).
      const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }); // prefix BOM
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `registrations-${eventId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      handleAdminMutationError(err);
    }
  };
}

export function useCheckInQr(eventId: string | undefined) {
  return useQuery<CheckInInfo, Error>({
    queryKey: queryKeys.checkin(eventId ?? ""),
    queryFn: async () => {
      return graphqlRequest<{
        adminEventCheckInQr: {
          qrToken: string;
          expiresAt?: string;
        };
      }>(ADMIN_EVENT_CHECK_IN_QR_QUERY, { eventId }).then((r) => ({
        qrToken: r.adminEventCheckInQr.qrToken,
        expiresAt: r.adminEventCheckInQr.expiresAt ?? "",
      }));
    },
    enabled: !!eventId,
    refetchInterval: 60000,
  });
}

export function useManualCheckIn() {
  const qc = useQueryClient();
  // BE nhận userId (không phải registrationId) cho check-in thủ công.
  return useMutation<Registration, Error, { eventId: string; userId: string }>({
    mutationFn: async ({ eventId, userId }) => {
      const res = await coreClient.post(`/event/admin/events/${eventId}/checkins/manual`, { userId });
      return res.data as Registration;
    },
    onSuccess: (_, { eventId }) => {
      qc.invalidateQueries({ queryKey: ["ops", "events", eventId, "registrations"] });
    },
    onError: handleAdminMutationError,
  });
}

export interface UpdateRecordingInput {
  eventId: string;
  recordingUrl: string;
}

export function useUpdateRecording() {
  const qc = useQueryClient();
  return useMutation<OfficialEvent, Error, UpdateRecordingInput>({
    mutationFn: async ({ eventId, recordingUrl }) => {
      // Recording lives on the core event surface, not /admin.
      const res = await coreClient.post(`/event/admin/events/${eventId}/recording`, { recordingUrl });
      return res.data as OfficialEvent;
    },
    onSuccess: (_, { eventId }) => qc.invalidateQueries({ queryKey: ["ops", "events", eventId] }),
    onError: handleAdminMutationError,
  });
}

export interface IssueCertificatesInput {
  eventId: string;
  criteria: "attended" | "all";
  rewardPoints?: number;
}

export function useIssueCertificates() {
  const qc = useQueryClient();
  return useMutation<CertificateIssueResult, Error, IssueCertificatesInput>({
    mutationFn: async ({ eventId, criteria }) => {
      const res = await coreClient.post<{ issued: number }>(
        `/event/admin/events/${eventId}/certificates/issue`,
        { criteria }
      );
      return { issuedCount: res.data.issued };
    },
    onSuccess: (_, { eventId }) => qc.invalidateQueries({ queryKey: ["ops", "events", eventId] }),
  });
}
