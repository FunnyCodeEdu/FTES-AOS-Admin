import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import { graphqlRequest } from "../../../shared/api/graphql";
import { handleAdminMutationError } from "../../../shared/api/errors";
import type { Banner, BannerPlacement, PaginatedResponse } from "../shared/types";

const ADMIN_BANNERS_QUERY = `query AdminBanners {
  adminBanners {
    id
    title
    placement
    status
    startAt
    endAt
  }
}`;

const queryKeys = {
  banners: (params: Record<string, unknown>) => ["ops", "banners", params] as const,
};

let mockBanners: Banner[] = [
  {
    id: "bn-1",
    title: "Banner kỳ thi THPT",
    imageUrl: "https://via.placeholder.com/1200x300",
    linkUrl: "/exam-prep",
    position: "home-hero",
    order: 1,
    activeFrom: "2026-06-01T00:00:00Z",
    activeTo: "2026-08-01T00:00:00Z",
    status: "active",
  },
];

function recalcStatus(banner: Banner) {
  const now = new Date();
  const from = banner.activeFrom ? new Date(banner.activeFrom) : null;
  const to = banner.activeTo ? new Date(banner.activeTo) : null;
  if (from && now < from) banner.status = "scheduled";
  else if (to && now > to) banner.status = "expired";
  else banner.status = "active";
}

mockBanners.forEach(recalcStatus);

export interface BannerListParams {
  position?: BannerPlacement;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

const MOCK_ENABLED_BANNERS = false;

export function useBanners(params: BannerListParams = {}) {
  return useQuery<PaginatedResponse<Banner>, Error>({
    queryKey: queryKeys.banners(params as Record<string, unknown>),
    queryFn: async () => {
      if (MOCK_ENABLED_BANNERS) {
        void apiClient;
        mockBanners.forEach(recalcStatus);
        let items = [...mockBanners];
        if (params.position) items = items.filter((b) => b.position === params.position);
        if (params.status) items = items.filter((b) => b.status === params.status);
        if (params.search) {
          const q = params.search.toLowerCase();
          items = items.filter((b) => b.title.toLowerCase().includes(q));
        }
        const page = params.page ?? 1;
        const pageSize = params.pageSize ?? 10;
        const start = (page - 1) * pageSize;
        return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
      }
      const data = await graphqlRequest<{
        adminBanners: Array<{
          id: string;
          title: string;
          placement: string;
          status: string;
          startAt?: string;
          endAt?: string;
        }>;
      }>(ADMIN_BANNERS_QUERY);
      let items = data.adminBanners.map((b) => ({
        id: b.id,
        title: b.title,
        imageUrl: "",
        linkUrl: undefined,
        position: b.placement as Banner["position"],
        order: 0,
        activeFrom: b.startAt,
        activeTo: b.endAt,
        status: b.status as Banner["status"],
      }));
      if (params.position) items = items.filter((b) => b.position === params.position);
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

export interface BannerInput {
  title: string;
  imageUrl: string;
  linkUrl?: string;
  position: BannerPlacement;
  order: number;
  activeFrom?: string;
  activeTo?: string;
  subtitle?: string;
  ctaText?: string;
  theme?: string;
}

// Remap FE input → BE BannerController DTO fields.
// placement←position, sortOrder←order, startsAt←activeFrom, endsAt←activeTo.
// subtitle/ctaText/theme map 1:1 (banner-slider-enrichment).
function toBannerBody(input: BannerInput) {
  return {
    title: input.title,
    imageUrl: input.imageUrl,
    linkUrl: input.linkUrl,
    placement: input.position,
    sortOrder: input.order,
    status: "PUBLISHED", // FE has no status field → publish immediately by default
    startsAt: input.activeFrom,
    endsAt: input.activeTo,
    subtitle: input.subtitle,
    ctaText: input.ctaText,
    theme: input.theme,
  };
}

export function useCreateBanner() {
  const qc = useQueryClient();
  return useMutation<Banner, Error, BannerInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post("/banners", toBannerBody(input));
      return res.data as Banner;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops", "banners"] }),
    onError: handleAdminMutationError,
  });
}

export function useUpdateBanner() {
  const qc = useQueryClient();
  return useMutation<Banner, Error, { id: string } & BannerInput>({
    mutationFn: async ({ id, ...input }) => {
      const res = await apiClient.patch(`/banners/${id}`, toBannerBody(input));
      return res.data as Banner;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops", "banners"] }),
    onError: handleAdminMutationError,
  });
}

export function useDeleteBanner() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/banners/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops", "banners"] }),
    onError: handleAdminMutationError,
  });
}
