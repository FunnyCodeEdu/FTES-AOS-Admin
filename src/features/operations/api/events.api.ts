import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, coreClient } from "../../../shared/api/client";
import { graphqlRequest } from "../../../shared/api/graphql";
import { handleAdminMutationError } from "../../../shared/api/errors";
import type {
  CertificateIssueResult,
  CheckInInfo,
  OfficialEvent,
  OfficialEventMode,
  OfficialEventType,
  PaginatedResponse,
  Registration,
} from "../shared/types";

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

export const mockRegistrations: Record<string, Registration[]> = {
  "evt-1": [
    { id: "reg-1", userId: "u-1", userName: "Nguyễn Văn A", email: "a@example.com", checkedIn: false, registeredAt: "2026-07-02T00:00:00Z" },
    { id: "reg-2", userId: "u-2", userName: "Trần Thị B", email: "b@example.com", checkedIn: true, checkedInAt: "2026-07-03T00:00:00Z", registeredAt: "2026-07-02T00:00:00Z" },
  ],
};

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
          ...(params.status ? { status: params.status } : {}),
          ...(params.type ? { type: params.type } : {}),
        },
        page: { page: Math.max(0, (params.page ?? 1) - 1), size: params.pageSize ?? 10 },
      }).then((r) => ({
        items: r.adminEvents.items.map((item) => ({
          id: item.id,
          type: item.type as OfficialEvent["type"],
          title: item.title,
          description: undefined,
          schedule: { startAt: item.startAt ?? "", endAt: item.endAt },
          mode: "online" as OfficialEvent["mode"],
          capacity: undefined,
          location: undefined,
          onlineLink: undefined,
          certificateConfig: undefined,
          rewardConfig: undefined,
          status: item.status as OfficialEvent["status"],
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
          type: item.type as OfficialEvent["type"],
          title: item.title,
          description: item.description,
          schedule: { startAt: item.startAt ?? "", endAt: item.endAt },
          mode: item.mode as OfficialEvent["mode"],
          capacity: item.capacity,
          location: item.location,
          onlineLink: item.onlineLink,
          certificateConfig: item.certificateConfig,
          rewardConfig: item.rewardConfig,
          status: item.status as OfficialEvent["status"],
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
        type: input.type,
        title: input.title,
        slug: `${slugify(input.title)}-${stableSuffix(input.title)}`,
        description: input.description,
        startAt: input.schedule.startAt,
        endAt: input.schedule.endAt,
        locationType: input.mode === "online" ? "ONLINE" : "OFFLINE",
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
      // 'ongoing'/'completed'/'draft' do BE lifecycle điều khiển, không phải admin action.
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

export function useExportRegistrations(eventId: string | undefined) {
  return () => {
    const rows = mockRegistrations[eventId ?? ""] ?? [];
    const csv = ["userId,userName,email,checkedIn,registeredAt", ...rows.map((r) => `${r.userId},"${r.userName}",${r.email},${r.checkedIn},${r.registeredAt}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registrations-${eventId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
