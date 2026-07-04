import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import type { Announcement, AnnouncementLevel, AnnouncementScopeType, PaginatedResponse } from "../shared/types";

const queryKeys = {
  announcements: (params: Record<string, unknown>) => ["ops", "announcements", params] as const,
};

let mockAnnouncements: Announcement[] = [
  {
    id: "an-1",
    content: "Cập nhật chính sách học phí.",
    level: "info",
    scopeType: "system",
    activeFrom: "2026-06-15T00:00:00Z",
    activeTo: "2026-09-15T00:00:00Z",
    status: "active",
    createdAt: "2026-06-15T00:00:00Z",
  },
];

function recalcStatus(a: Announcement) {
  const now = new Date();
  const from = a.activeFrom ? new Date(a.activeFrom) : null;
  const to = a.activeTo ? new Date(a.activeTo) : null;
  if (from && now < from) a.status = "scheduled";
  else if (to && now > to) a.status = "expired";
  else a.status = "active";
}

mockAnnouncements.forEach(recalcStatus);

export interface AnnouncementListParams {
  scopeType?: AnnouncementScopeType;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export function useAnnouncements(params: AnnouncementListParams = {}) {
  return useQuery<PaginatedResponse<Announcement>, Error>({
    queryKey: queryKeys.announcements(params as Record<string, unknown>),
    queryFn: async () => {
      void apiClient;
      mockAnnouncements.forEach(recalcStatus);
      let items = [...mockAnnouncements];
      if (params.scopeType) items = items.filter((a) => a.scopeType === params.scopeType);
      if (params.status) items = items.filter((a) => a.status === params.status);
      if (params.search) {
        const q = params.search.toLowerCase();
        items = items.filter((a) => a.content.toLowerCase().includes(q));
      }
      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 10;
      const start = (page - 1) * pageSize;
      return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
    },
  });
}

export interface AnnouncementInput {
  content: string;
  level: AnnouncementLevel;
  scopeType: AnnouncementScopeType;
  scopeId?: string;
  activeFrom?: string;
  activeTo?: string;
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation<Announcement, Error, AnnouncementInput>({
    mutationFn: async (input) => {
      void apiClient;
      const a: Announcement = { id: `an-${Date.now()}`, ...input, status: "active", createdAt: new Date().toISOString() };
      recalcStatus(a);
      mockAnnouncements.unshift(a);
      return a;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops", "announcements"] }),
  });
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient();
  return useMutation<Announcement, Error, { id: string } & AnnouncementInput>({
    mutationFn: async ({ id, ...input }) => {
      void apiClient;
      const idx = mockAnnouncements.findIndex((a) => a.id === id);
      if (idx === -1) throw new Error("Announcement not found");
      const updated: Announcement = { ...mockAnnouncements[idx], ...input, status: "active" };
      recalcStatus(updated);
      mockAnnouncements[idx] = updated;
      return updated;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops", "announcements"] }),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      void apiClient;
      mockAnnouncements = mockAnnouncements.filter((a) => a.id !== id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops", "announcements"] }),
  });
}
