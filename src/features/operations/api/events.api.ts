import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import { useMe } from "../../auth/api";
import type {
  CertificateIssueResult,
  CheckInInfo,
  OfficialEvent,
  OfficialEventMode,
  OfficialEventType,
  PaginatedResponse,
  Registration,
} from "../shared/types";

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

export function useEvents(params: EventListParams = {}) {
  return useQuery<PaginatedResponse<OfficialEvent>, Error>({
    queryKey: queryKeys.events(params as Record<string, unknown>),
    queryFn: async () => {
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
    },
  });
}

export function useEvent(id: string | undefined) {
  return useQuery<OfficialEvent, Error>({
    queryKey: queryKeys.event(id ?? ""),
    queryFn: async () => {
      void apiClient;
      const event = mockEvents.find((e) => e.id === id);
      if (!event) throw new Error("Event not found");
      return event;
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

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation<OfficialEvent, Error, CreateEventInput>({
    mutationFn: async (input) => {
      void apiClient;
      const event: OfficialEvent = { id: `evt-${Date.now()}`, ...input, status: "draft", createdAt: new Date().toISOString() };
      mockEvents.unshift(event);
      mockRegistrations[event.id] = [];
      return event;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops", "events"] }),
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
    mutationFn: async ({ id, toStatus, reason }) => {
      void apiClient;
      const event = mockEvents.find((e) => e.id === id);
      if (!event) throw new Error("Event not found");
      if (toStatus === "cancelled" && event.status !== "cancelled") {
        event.cancelledReason = reason;
      }
      event.status = toStatus;
      return event;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["ops", "events", id] });
      qc.invalidateQueries({ queryKey: ["ops", "events"] });
    },
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
      void apiClient;
      const list = mockRegistrations[eventId ?? ""] ?? [];
      let items = [...list];
      if (params.checkedIn !== undefined) items = items.filter((r) => r.checkedIn === params.checkedIn);
      if (params.search) {
        const q = params.search.toLowerCase();
        items = items.filter((r) => r.userName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
      }
      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 10;
      const start = (page - 1) * pageSize;
      return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
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
      void apiClient;
      return { qrToken: `qr-${eventId}-${Date.now()}`, expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() };
    },
    enabled: !!eventId,
    refetchInterval: 60000,
  });
}

export function useManualCheckIn() {
  const qc = useQueryClient();
  return useMutation<Registration, Error, { eventId: string; registrationId: string }>({
    mutationFn: async ({ eventId, registrationId }) => {
      void apiClient;
      const list = mockRegistrations[eventId];
      if (!list) throw new Error("Event not found");
      const reg = list.find((r) => r.id === registrationId);
      if (!reg) throw new Error("Registration not found");
      reg.checkedIn = true;
      reg.checkedInAt = new Date().toISOString();
      return reg;
    },
    onSuccess: (_, { eventId }) => {
      qc.invalidateQueries({ queryKey: ["ops", "events", eventId, "registrations"] });
    },
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
      void apiClient;
      const event = mockEvents.find((e) => e.id === eventId);
      if (!event) throw new Error("Event not found");
      event.recordingUrl = recordingUrl;
      return event;
    },
    onSuccess: (_, { eventId }) => qc.invalidateQueries({ queryKey: ["ops", "events", eventId] }),
  });
}

export interface IssueCertificatesInput {
  eventId: string;
  criteria: "attended" | "all";
  rewardPoints?: number;
}

export function useIssueCertificates() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  return useMutation<CertificateIssueResult, Error, IssueCertificatesInput>({
    mutationFn: async ({ eventId, criteria }) => {
      void apiClient;
      void me;
      const list = mockRegistrations[eventId] ?? [];
      const targets = criteria === "attended" ? list.filter((r) => r.checkedIn) : list;
      return { issuedCount: targets.length };
    },
    onSuccess: (_, { eventId }) => qc.invalidateQueries({ queryKey: ["ops", "events", eventId] }),
  });
}
