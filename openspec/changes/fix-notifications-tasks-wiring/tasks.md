## 1. Rewire notification reads

- [x] 1.1 `useNotifications`: use `coreClient.get("/notifications", {params:{page:pageParam ?? 0, size:20}})`; map BE `PageView{items,page,size,total,totalPages}` → `NotificationsResponse` (`nextCursor = page+1 < totalPages ? String(page+1) : undefined`, `unreadCount = items.filter(i=>!i.readAt).length`).
- [x] 1.2 `useUnreadCount`: use `coreClient.get("/notifications/unread-count")`; map BE `UnreadCount{count}` → `NotificationsResponse` with `unreadCount = count`.

## 2. Rewire notification writes

- [x] 2.1 `useMarkRead`: `coreClient.post("/notifications/{id}/read")` (BE `POST /api/v1/notifications/{id}/read` confirmed).
- [x] 2.2 `useMarkAllRead`: `coreClient.post("/notifications/read-all")` (BE `POST /api/v1/notifications/read-all` confirmed).

## 3. Rewire running tasks

- [x] 3.1 `useRunningTasks`: `apiClient.get("/workflow/tasks", {params:{status:"running"}})` → `GET /api/v1/admin/workflow/tasks`; keep `TasksResponse` shape. Depends on parallel BE change.

## 4. Verification

- [ ] 4.1 `npm run build` green (owner verifies).
- [ ] 4.2 `tsc --noEmit` clean (owner verifies).
- [x] 4.3 `openspec validate fix-notifications-tasks-wiring --strict` passes.
