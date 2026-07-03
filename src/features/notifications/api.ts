import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../../shared/api/client";
import { queryClient } from "../../shared/api/queryClient";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt?: string;
  createdAt: string;
}

export interface NotificationsResponse {
  items: NotificationItem[];
  nextCursor?: string;
  unreadCount: number;
}

export interface AsyncTask {
  id: string;
  kind: string;
  label: string;
  progress: number;
  status: "running" | "completed" | "failed";
  resultUrl?: string;
  message?: string;
}

export interface TasksResponse {
  items: AsyncTask[];
}

export function useNotifications() {
  return useInfiniteQuery<NotificationsResponse, Error>({
    queryKey: ["notifications", "list"],
    queryFn: ({ pageParam }) =>
      apiClient
        .get("/notifications", { params: { cursor: pageParam, limit: 20 } })
        .then((r) => r.data as NotificationsResponse),
    getNextPageParam: (last) => last.nextCursor,
    initialPageParam: undefined as string | undefined,
  });
}

export function useUnreadCount() {
  return useQuery<NotificationsResponse, Error>({
    queryKey: ["notifications", "unread-count"],
    queryFn: () =>
      apiClient
        .get("/notifications", { params: { limit: 0 } })
        .then((r) => r.data as NotificationsResponse),
    refetchInterval: 30_000,
  });
}

export function useMarkRead() {
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      apiClient.post(`/notifications/${id}/read`).then(() => undefined),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllRead() {
  return useMutation<void, Error, void>({
    mutationFn: () => apiClient.post("/notifications/read-all").then(() => undefined),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useRunningTasks() {
  return useQuery<TasksResponse, Error>({
    queryKey: ["tasks", "running"],
    queryFn: () => apiClient.get("/tasks?status=running").then((r) => r.data as TasksResponse),
    refetchInterval: (query) => {
      const data = query.state.data;
      return data && data.items.length > 0 ? 5000 : false;
    },
  });
}
