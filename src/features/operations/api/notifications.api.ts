import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import type { Broadcast, BroadcastPreview, BroadcastSegment, PaginatedResponse } from "../shared/types";

const queryKeys = {
  broadcasts: (params: Record<string, unknown>) => ["ops", "notifications", params] as const,
};

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
      const res = await apiClient.get<PaginatedResponse<Broadcast>>("/operations/notifications", {
        params: {
          ...(params.status ? { status: params.status } : {}),
          ...(params.search ? { search: params.search } : {}),
          page: params.page ?? 1,
          pageSize: params.pageSize ?? 10,
        },
      });
      return res.data;
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
      const res = await apiClient.post<BroadcastPreview>("/operations/notifications/preview", { segment });
      return res.data;
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
      const res = await apiClient.post<Broadcast>("/operations/notifications", input);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops", "notifications"] }),
  });
}

export function useCancelBroadcast() {
  const qc = useQueryClient();
  return useMutation<Broadcast, Error, string>({
    mutationFn: async (id) => {
      const res = await apiClient.post<Broadcast>(`/operations/notifications/${id}/cancel`);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops", "notifications"] }),
  });
}
