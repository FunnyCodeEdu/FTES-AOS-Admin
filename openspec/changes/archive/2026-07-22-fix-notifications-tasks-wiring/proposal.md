## Why

`src/features/notifications/api.ts` points the notification hooks at admin REST paths that do not exist. All calls go through `apiClient` (base `/api/v1/admin`), so `apiClient.get("/notifications")` resolves to `GET /api/v1/admin/notifications` — an unmapped route that returns 500. The notification bell and drawer are therefore permanently broken.

The FTES-AOS-Backend already exposes a working user-scoped notification API under `/api/v1/notifications` (200, envelope `{code,message,data}`, `data` = `PageView{items,page,size,total,totalPages}`), plus a dedicated `GET /api/v1/notifications/unread-count` and the `POST /{id}/read` / `POST /read-all` command endpoints. We wire the FE to those real endpoints via the existing `coreClient` (base `/api/v1`). The running-tasks hook is repointed to the forthcoming admin workflow endpoint `GET /api/v1/admin/workflow/tasks?status=running`.

## What Changes

- `useNotifications`: switch from `apiClient.get("/notifications", {params:{cursor,limit}})` to `coreClient.get("/notifications", {params:{page,size}})`, driving `page` from `pageParam`. Map BE `PageView{items,page,size,total,totalPages}` to FE `NotificationsResponse{items,nextCursor,unreadCount}`: `nextCursor = page+1 < totalPages ? String(page+1) : undefined`; `unreadCount = items.filter(i => !i.readAt).length`.
- `useUnreadCount`: switch to the dedicated `coreClient.get("/notifications/unread-count")` returning BE `UnreadCount{count}`, mapped to `NotificationsResponse` with `unreadCount = count`.
- `useMarkRead` / `useMarkAllRead`: switch from `apiClient` to `coreClient` at `/notifications/{id}/read` and `/notifications/read-all` (both confirmed present on the BE controller).
- `useRunningTasks`: switch from `apiClient.get("/tasks?status=running")` to `apiClient.get("/workflow/tasks", {params:{status:"running"}})` → `GET /api/v1/admin/workflow/tasks`. `TasksResponse` shape unchanged.
- The `NotificationItem` shape (id, type, title, body, readAt, createdAt) already matches BE `NotificationView` field-for-field; no rename needed. `NotificationCenter.tsx` consumers are unchanged.

## Impact

- `src/features/notifications/api.ts` (rewire 5 hooks)
- No change to `NotificationCenter.tsx` public behavior; no new dependencies; no backend changes in this repo.
- Depends on the parallel BE change adding `GET /api/v1/admin/workflow/tasks`.
