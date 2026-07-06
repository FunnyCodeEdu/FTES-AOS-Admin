import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import { graphqlRequest } from "../../../shared/api/graphql";
import { handleAdminMutationError } from "../../../shared/api/errors";
import type { Banner, BannerPlacement, PaginatedResponse } from "../shared/types";

const ADMIN_BANNERS_QUERY = `query AdminBanners($page: Int, $pageSize: Int, $search: String, $position: String, $status: String) {
  adminBanners(page: $page, pageSize: $pageSize, search: $search, position: $position, status: $status) {
    items {
      id
      title
      imageUrl
      linkUrl
      position
      order
      activeFrom
      activeTo
      status
    }
    total
    page
    pageSize
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
      return graphqlRequest<{ adminBanners: PaginatedResponse<Banner> }>(ADMIN_BANNERS_QUERY, {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        position: params.position,
        status: params.status,
      }).then((r) => r.adminBanners);
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
}

export function useCreateBanner() {
  const qc = useQueryClient();
  return useMutation<Banner, Error, BannerInput>({
    mutationFn: async (input) => {
      void apiClient;
      const banner: Banner = { id: `bn-${Date.now()}`, ...input, status: "active" };
      recalcStatus(banner);
      mockBanners.unshift(banner);
      return banner;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops", "banners"] }),
  });
}

export function useUpdateBanner() {
  const qc = useQueryClient();
  return useMutation<Banner, Error, { id: string } & BannerInput>({
    mutationFn: async ({ id, ...input }) => {
      void apiClient;
      const idx = mockBanners.findIndex((b) => b.id === id);
      if (idx === -1) throw new Error("Banner not found");
      const updated: Banner = { ...mockBanners[idx], ...input, status: "active" };
      recalcStatus(updated);
      mockBanners[idx] = updated;
      return updated;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops", "banners"] }),
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
