# notification-center Specification

## Purpose
TBD - created by archiving change fix-notifications-tasks-wiring. Update Purpose after archive.
## Requirements
### Requirement: Notification list reads from the user notification endpoint
The notification center SHALL fetch the notification list from `GET /api/v1/notifications` via `coreClient`, not from any `/api/v1/admin` path.

#### Scenario: First page load
- **WHEN** `useNotifications` runs with no page param
- **THEN** it calls `coreClient.get("/notifications", {params:{page:0, size:20}})`
- **AND** it maps BE `PageView{items,page,size,total,totalPages}` to `NotificationsResponse{items, nextCursor, unreadCount}`

#### Scenario: Cursor derivation
- **WHEN** the BE returns `page` and `totalPages`
- **THEN** `nextCursor` is `String(page+1)` when `page+1 < totalPages`, otherwise `undefined`
- **AND** the next `useInfiniteQuery` fetch passes that cursor as the `page` param

#### Scenario: Per-page unread count
- **WHEN** the mapped page is produced
- **THEN** `unreadCount` equals the number of returned items whose `readAt` is falsy

### Requirement: Unread badge reads the dedicated unread-count endpoint
`useUnreadCount` SHALL read `GET /api/v1/notifications/unread-count` via `coreClient` and expose the BE `count` as `unreadCount`.

#### Scenario: Badge refresh
- **WHEN** `useUnreadCount` runs
- **THEN** it calls `coreClient.get("/notifications/unread-count")`
- **AND** returns `NotificationsResponse` with `unreadCount` set to the BE `count` field

### Requirement: Mark-read commands hit the user notification endpoints
Mark-as-read mutations SHALL use `coreClient` against the confirmed BE command paths.

#### Scenario: Mark one read
- **WHEN** `useMarkRead` mutates with an id
- **THEN** it calls `coreClient.post("/notifications/{id}/read")`

#### Scenario: Mark all read
- **WHEN** `useMarkAllRead` mutates
- **THEN** it calls `coreClient.post("/notifications/read-all")`

### Requirement: Running tasks read the admin workflow endpoint
`useRunningTasks` SHALL read running async tasks from `GET /api/v1/admin/workflow/tasks?status=running` via `apiClient`.

#### Scenario: Poll running tasks
- **WHEN** `useRunningTasks` runs
- **THEN** it calls `apiClient.get("/workflow/tasks", {params:{status:"running"}})`
- **AND** the returned `TasksResponse{items}` shape is unchanged

