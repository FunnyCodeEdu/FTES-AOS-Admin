import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { apiClient, coreClient } from "../../shared/api/client";
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

// BE `GET /api/v1/notifications` envelope data: PageView{items,page,size,total,totalPages}
// (NotificationViews.PageView). Item fields map 1:1 onto NotificationItem.
interface NotificationPageView {
  items: NotificationItem[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export function useNotifications() {
  return useInfiniteQuery<NotificationsResponse, Error>({
    queryKey: ["notifications", "list"],
    queryFn: ({ pageParam }) =>
      coreClient
        .get("/notifications", { params: { page: pageParam ?? 0, size: 20 } })
        .then((r) => {
          const data = r.data as NotificationPageView;
          const nextCursor =
            data.page + 1 < data.totalPages ? String(data.page + 1) : undefined;
          return {
            items: data.items,
            nextCursor,
            unreadCount: data.items.filter((i) => !i.readAt).length,
          } satisfies NotificationsResponse;
        }),
    getNextPageParam: (last) => last.nextCursor,
    initialPageParam: undefined as string | undefined,
  });
}

export function useUnreadCount() {
  return useQuery<NotificationsResponse, Error>({
    queryKey: ["notifications", "unread-count"],
    // BE `GET /api/v1/notifications/unread-count` envelope data: UnreadCount{count}.
    queryFn: () =>
      coreClient.get("/notifications/unread-count").then((r) => {
        const data = r.data as { count: number };
        return {
          items: [],
          nextCursor: undefined,
          unreadCount: data.count,
        } satisfies NotificationsResponse;
      }),
    refetchInterval: 30_000,
  });
}

export function useMarkRead() {
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      coreClient.post(`/notifications/${id}/read`).then(() => undefined),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllRead() {
  return useMutation<void, Error, void>({
    mutationFn: () => coreClient.post("/notifications/read-all").then(() => undefined),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useRunningTasks() {
  return useQuery<TasksResponse, Error>({
    queryKey: ["tasks", "running"],
    // BE `GET /api/v1/admin/workflow/tasks?status=running` (apiClient base /api/v1/admin).
    queryFn: () =>
      apiClient
        .get("/workflow/tasks", { params: { status: "running" } })
        .then((r) => r.data as TasksResponse),
    refetchInterval: (query) => {
      const data = query.state.data;
      return data && data.items.length > 0 ? 5000 : false;
    },
  });
}
