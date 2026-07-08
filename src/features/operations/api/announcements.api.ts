import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import { graphqlRequest } from "../../../shared/api/graphql";
import { handleAdminMutationError } from "../../../shared/api/errors";
import type { Announcement, AnnouncementLevel, AnnouncementScopeType, PaginatedResponse } from "../shared/types";

const ADMIN_ANNOUNCEMENTS_QUERY = `query AdminAnnouncements {
  adminAnnouncements {
    id
    title
    audience
    status
    scheduledAt
  }
}`;

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

const MOCK_ENABLED_ANNOUNCEMENTS = false;

export function useAnnouncements(params: AnnouncementListParams = {}) {
  return useQuery<PaginatedResponse<Announcement>, Error>({
    queryKey: queryKeys.announcements(params as Record<string, unknown>),
    queryFn: async () => {
      if (MOCK_ENABLED_ANNOUNCEMENTS) {
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
      }
      const data = await graphqlRequest<{
        adminAnnouncements: Array<{
          id: string;
          title: string;
          audience: string;
          status: string;
          scheduledAt?: string;
        }>;
      }>(ADMIN_ANNOUNCEMENTS_QUERY);
      let items = data.adminAnnouncements.map((a) => ({
        id: a.id,
        content: a.title,
        level: "info" as Announcement["level"],
        scopeType: a.audience as Announcement["scopeType"],
        scopeId: undefined,
        activeFrom: a.scheduledAt,
        activeTo: undefined,
        status: a.status as Announcement["status"],
        createdAt: a.scheduledAt ?? new Date().toISOString(),
      }));
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

// Remap FE input → BE AnnouncementController DTO fields.
// body←content, severity←level, audience←scopeType, publishAt←activeFrom, expiresAt←activeTo.
function toAnnouncementBody(input: AnnouncementInput) {
  return {
    // BE requires a title but FE form only has content → derive from first line of content.
    title: (input.content.split("\n")[0] || input.content).slice(0, 120),
    body: input.content,
    severity: input.level,
    audience: input.scopeType,
    channels: ["IN_APP"] as string[], // FE has no channel picker → sensible default
    status: "PUBLISHED", // create/update intent in this admin UI is to publish immediately
    publishAt: input.activeFrom,
    expiresAt: input.activeTo,
  };
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation<Announcement, Error, AnnouncementInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post("/announcements", toAnnouncementBody(input));
      return res.data as Announcement;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops", "announcements"] }),
    onError: handleAdminMutationError,
  });
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient();
  return useMutation<Announcement, Error, { id: string } & AnnouncementInput>({
    mutationFn: async ({ id, ...input }) => {
      const res = await apiClient.patch(`/announcements/${id}`, toAnnouncementBody(input));
      return res.data as Announcement;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops", "announcements"] }),
    onError: handleAdminMutationError,
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/announcements/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops", "announcements"] }),
    onError: handleAdminMutationError,
  });
}
