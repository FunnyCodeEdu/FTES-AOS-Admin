# Design — admin-community-console

## 1. Route & màn hình

| Route | Màn hình | Layout / thành phần chính |
|---|---|---|
| `/moderation/queue` | Moderation Queue | Tabs theo loại đối tượng (Posts / Comments / Resources) + filter mảng, mức độ, trạng thái; bảng server-side pagination; drawer chi tiết report (nội dung bị report, danh sách reporter, lịch sử xử lý); action bar Approve / Reject / Remove / Escalate |
| `/moderation/workflow` | Content Workflow Board | Kanban 6 cột: Draft → AI Review → Mod Review → Approved → Published → Archived; card = content item (title, author, loại, thời gian); kéo thả transition; filter loại nội dung + search; drawer chi tiết card |
| `/moderation/log` | Moderation Log | Bảng chỉ đọc server-side pagination; filter actor / action / loại đối tượng / khoảng thời gian; drawer detail từng entry |
| `/community/posts` | Posts Management | Bảng server-side pagination/sort; search theo tiêu đề/tác giả; filter trạng thái, group, pinned/featured/hidden; row action Pin / Feature / Hide (toggle) + xem chi tiết drawer |
| `/community/groups` | Groups Management | Bảng list group: tên, owner, member count, trạng thái (active/locked), CTV được gán; search + filter trạng thái |
| `/community/groups/:groupId` | Group Detail | Tabs: Overview (thông tin, owner, stats), Members, Posts của group, CTV assignments; action Đổi owner (modal search user), Khoá/Mở khoá group, Gán/Thu hồi CTV |
| `/community/events` | Community Events Review | Bảng event do group tạo, filter trạng thái duyệt (pending/approved/rejected); drawer chi tiết event; action Approve / Reject kèm lý do |

Tất cả nằm trong app shell của `admin-foundation` (sider nav + header). Nav item chỉ render khi
user có ít nhất 1 permission tương ứng của nhóm route.

## 2. Permission gates

Permission leaf (BE trả sau login, kèm scoped grants `{permission, scopeType, scopeId}`):

| Permission | Gate |
|---|---|
| `community.report.view` | Nav + route `/moderation/queue`; CTV: chỉ load report trong scope |
| `community.report.resolve` | Nút Approve / Reject / Remove trong queue |
| `community.report.escalate` | Nút Escalate (Moderator/CTV đẩy lên admin mảng) |
| `workflow.review` | Nav + route `/moderation/workflow`; kéo card vào/ra cột Mod Review |
| `workflow.publish` | Kéo card Approved → Published (thường chỉ admin-community) |
| `community.modlog.view` | Nav + route `/moderation/log` |
| `community.post.view` | Nav + route `/community/posts` |
| `community.post.pin` / `community.post.feature` / `community.post.hide` | Từng nút hành động tương ứng trên row |
| `group.view` | Nav + route `/community/groups`, `/community/groups/:groupId` |
| `group.transfer` | Nút Đổi owner |
| `group.lock` | Nút Khoá/Mở khoá group |
| `group.assign_ctv` | Tab CTV assignments + nút Gán/Thu hồi CTV |
| `community.event.review` | Nav + route `/community/events` + nút Approve/Reject event |

Hành vi thiếu quyền: nav item ẩn; truy cập trực tiếp URL → trang 403 Forbidden hiển thị permission
thiếu; nút hành động không có quyền → không render (không disable-mờ). Kanban: cột mà user không có
quyền transition vào sẽ không nhận drop (visual cue "không thể thả" khi kéo).

Scope CTV: BE enforce filter; FE đọc scoped grants — nếu user chỉ có grant
`{community.report.view, scopeType: "group", scopeId}` thì queue tự gắn param `scopeId`, hiển thị
scope picker khi có nhiều scope, và ẩn mọi dữ liệu ngoài scope. CTV không có `workflow.publish`,
`group.lock`, `group.transfer` (subset do admin mảng cấp).

## 3. API contract tiêu thụ

Envelope chuẩn `{code, message, data|null}`, Bearer JWT. **Assumption**: các endpoint dưới đây thuộc
change `admin-api` bên FTES-AOS-Backend; những endpoint đánh dấu (A) chưa có spec BE tương ứng,
cần BE bổ sung trước khi implement.

| Method | Path | Quyền | Request / Response chính |
|---|---|---|---|
| GET | `/api/v1/admin/moderation/reports` | `community.report.view` | Query: `page,pageSize,type(post\|comment\|resource),status,severity,scopeId,search` → `data: {items: Report[], total}` |
| GET | `/api/v1/admin/moderation/reports/:id` | `community.report.view` | → `data: ReportDetail` (content snapshot, reporters[], history[]) |
| POST | `/api/v1/admin/moderation/reports/:id/resolve` | `community.report.resolve` | Body: `{action: "approve"\|"reject"\|"remove", reason}` → `data: Report` |
| POST | `/api/v1/admin/moderation/reports/:id/escalate` | `community.report.escalate` | Body: `{reason}` → `data: Report` (status=escalated) |
| GET | `/api/v1/admin/moderation/workflow/items` (A) | `workflow.review` | Query: `stage,type,search,page,pageSize` → `data: {items: WorkflowItem[], total}` |
| POST | `/api/v1/admin/moderation/workflow/items/:id/transition` (A) | `workflow.review` / `workflow.publish` theo target | Body: `{toStage, note?}` → `data: WorkflowItem`; 403 nếu transition không được phép |
| GET | `/api/v1/admin/moderation/log` | `community.modlog.view` | Query: `actorId,action,targetType,from,to,page,pageSize` → `data: {items: ModLogEntry[], total}` |
| GET | `/api/v1/admin/community/posts` | `community.post.view` | Query: `page,pageSize,search,groupId,status,pinned,featured` → `data: {items: Post[], total}` |
| POST | `/api/v1/admin/community/posts/:id/pin` / `unpin` | `community.post.pin` | → `data: Post` |
| POST | `/api/v1/admin/community/posts/:id/feature` / `unfeature` | `community.post.feature` | → `data: Post` |
| POST | `/api/v1/admin/community/posts/:id/hide` / `unhide` | `community.post.hide` | Body hide: `{reason}` → `data: Post` |
| GET | `/api/v1/admin/community/groups` | `group.view` | Query: `page,pageSize,search,status` → `data: {items: Group[], total}` |
| GET | `/api/v1/admin/community/groups/:id` | `group.view` | → `data: GroupDetail` |
| POST | `/api/v1/admin/community/groups/:id/transfer-owner` | `group.transfer` | Body: `{newOwnerId, reason}` → `data: Group` |
| POST | `/api/v1/admin/community/groups/:id/lock` / `unlock` | `group.lock` | Body lock: `{reason}` → `data: Group` |
| POST | `/api/v1/admin/community/groups/:id/ctv-assignments` (A) | `group.assign_ctv` | Body: `{userId, permissions[]}` → `data: CtvAssignment`; DELETE `/ctv-assignments/:assignmentId` để thu hồi |
| GET | `/api/v1/admin/community/events` (A) | `community.event.review` | Query: `page,pageSize,status,groupId,search` → `data: {items: CommunityEvent[], total}` |
| POST | `/api/v1/admin/community/events/:id/review` (A) | `community.event.review` | Body: `{decision: "approve"\|"reject", reason?}` (reason bắt buộc khi reject) → `data: CommunityEvent` |

## 4. State & data

- TanStack Query keys:
  - `['moderation','reports', filters]`, `['moderation','reports', id]`
  - `['moderation','workflow', filters]`, `['moderation','log', filters]`
  - `['community','posts', filters]`, `['community','groups', filters]`,
    `['community','groups', id]`, `['community','events', filters]`
- Mutation → invalidate: resolve/escalate → `['moderation','reports']` + `['moderation','log']`;
  transition → `['moderation','workflow']`; pin/feature/hide → `['community','posts']`;
  group actions → `['community','groups']` (+ detail key); event review → `['community','events']`.
- Kanban transition dùng optimistic update (di chuyển card ngay), rollback khi mutation lỗi + message.
- Zustand: `useModerationScopeStore` — scope đang chọn của CTV (persist sessionStorage);
  filter bảng giữ trong URL search params (không dùng store) để share được link.

## 5. Luồng nghiệp vụ chính

**Flow 1 — Xử lý report (Moderator):**
1. Mở `/moderation/queue`, chọn tab Posts, filter severity=high.
2. Click row → drawer chi tiết: snapshot nội dung, danh sách reporter + lý do, lịch sử.
3. Bấm Remove → modal confirm nêu hệ quả ("Nội dung bị gỡ khỏi cộng đồng, tác giả được thông báo")
   + textarea lý do (bắt buộc, min 10 ký tự).
4. Submit → POST resolve → success: toast, row rời queue, log mới xuất hiện ở `/moderation/log`.
5. Nhánh lỗi: 403 (mất quyền giữa chừng) → toast lỗi + refetch permission; 409 (report đã được người
   khác xử lý) → toast "Report đã được xử lý", refetch list.

**Flow 2 — Escalate của CTV scoped:**
1. CTV có grant scope group G mở queue → chỉ thấy report của group G (scope picker nếu nhiều scope).
2. Report vượt thẩm quyền (không có `community.report.resolve`) → chỉ thấy nút Escalate.
3. Escalate kèm lý do → report chuyển trạng thái escalated, biến khỏi queue CTV, xuất hiện trong
   queue admin-community.

**Flow 3 — Kéo thả workflow:**
1. Admin-community mở `/moderation/workflow`, kéo card từ Mod Review → Approved.
2. FE kiểm tra client-side transition hợp lệ + có quyền → optimistic move → POST transition.
3. BE trả 403/422 → card quay về cột cũ + notification lỗi kèm lý do BE trả.
4. Kéo Approved → Published yêu cầu `workflow.publish`; thiếu quyền thì cột Published không nhận
   drop ngay từ khi bắt đầu kéo.

**Flow 4 — Khoá group:**
1. Từ Group Detail bấm Khoá group → confirm modal nêu hệ quả (member không đăng bài được,
   group ẩn khỏi khám phá) + lý do bắt buộc.
2. Submit → POST lock → badge trạng thái đổi Locked, hành động ghi audit (BE), moderation log có entry.

## 6. UX states

- Loading: skeleton mirror layout — bảng: skeleton rows đúng số cột; kanban: skeleton card trong
  từng cột; drawer: skeleton block theo section.
- Empty: bảng/queue rỗng → Ant Design `Empty` + mô tả ngữ cảnh ("Không có report nào trong scope
  của bạn"); kanban cột rỗng → placeholder nhạt.
- Error: `Result` status 500 + nút Thử lại (refetch); lỗi mutation → `notification.error` với
  message từ envelope.
- Confirm-on-destructive: Remove content, Hide post, Khoá group, Đổi owner, Reject event, Thu hồi
  CTV — modal confirm nêu hệ quả + lý do bắt buộc (trừ unhide/unpin không cần lý do).
- 403 trực tiếp URL: trang Forbidden hiển thị permission thiếu (theo `admin-foundation`).
