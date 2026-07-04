import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import type { Broadcast, BroadcastPreview, BroadcastSegment, PaginatedResponse } from "../shared/types";

const queryKeys = {
  broadcasts: (params: Record<string, unknown>) => ["ops", "notifications", params] as const,
};

const mockBroadcasts: Broadcast[] = [
  {
    id: "bc-1",
    title: "Thông báo bảo trì",
    content: "Hệ thống bảo trì từ 00:00 đến 02:00.",
    channels: ["in-app"],
    segment: { roles: ["student"] },
    status: "sent",
    stats: { sent: 1200, delivered: 1150, read: 980 },
    createdAt: "2026-07-01T08:00:00Z",
  },
];

export interface BroadcastListParams {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export function useBroadcasts(params: BroadcastListParams = {}) {
  return useQuery<PaginatedResponse<Broadcast>, Error>({
    queryKey: queryKeys.broadcasts(params as Record<string, unknown>),
    queryFn: async () => {
      // MOCK: replace with apiClient.get("/admin/operations/notifications", { params }) when BE ready
      void apiClient;
      let items = [...mockBroadcasts];
      if (params.status) items = items.filter((b) => b.status === params.status);
      if (params.search) {
        const q = params.search.toLowerCase();
        items = items.filter((b) => b.title.toLowerCase().includes(q));
      }
      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 10;
      const start = (page - 1) * pageSize;
      return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
    },
  });
}

export interface PreviewBroadcastParams {
  segment: BroadcastSegment;
}

export function usePreviewBroadcast(segment: BroadcastSegment) {
  return useQuery<BroadcastPreview, Error>({
    queryKey: ["ops", "notifications", "preview", JSON.stringify(segment)],
    queryFn: async () => {
      // MOCK: replace with apiClient.post("/admin/operations/notifications/preview", { segment }) when BE ready
      void apiClient;
      return {
        recipientCount: 1234,
        sample: [
          { id: "u-1", fullName: "Nguyễn Văn A", email: "a@example.com" },
          { id: "u-2", fullName: "Trần Thị B", email: "b@example.com" },
        ],
      };
    },
    enabled: false,
    staleTime: 0,
  });
}

export interface CreateBroadcastInput {
  title: string;
  content: string;
  channels: string[];
  segment: BroadcastSegment;
  scheduleAt?: string;
}

export function useCreateBroadcast() {
  const qc = useQueryClient();
  return useMutation<Broadcast, Error, CreateBroadcastInput>({
    mutationFn: async (input) => {
      void apiClient;
      const broadcast: Broadcast = {
        id: `bc-${Date.now()}`,
        ...input,
        channels: input.channels as Broadcast["channels"],
        status: input.scheduleAt ? "scheduled" : "sending",
        stats: { sent: 0, delivered: 0, read: 0 },
        createdAt: new Date().toISOString(),
      };
      mockBroadcasts.unshift(broadcast);
      return broadcast;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops", "notifications"] }),
  });
}

export function useCancelBroadcast() {
  const qc = useQueryClient();
  return useMutation<Broadcast, Error, string>({
    mutationFn: async (id) => {
      void apiClient;
      const item = mockBroadcasts.find((b) => b.id === id);
      if (!item) throw new Error("Broadcast not found");
      if (item.status !== "scheduled") throw new Error("Chỉ có thể hủy broadcast đang ở trạng thái scheduled");
      item.status = "cancelled";
      return item;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops", "notifications"] }),
  });
}
