# Tasks — admin-community-console

## 1. Khung feature & API layer

- [x] 1.1 Tạo feature folder `src/features/moderation/` và `src/features/community/`
      (pages + api + components) theo convention `docs/ADMIN-ARCHITECTURE.md`.
- [x] 1.2 Viết API client module `src/features/moderation/api/moderation.api.ts` và
      `src/features/community/api/community.api.ts` (typed request/response, envelope).
- [x] 1.3 Khai báo query keys + hooks TanStack Query (`useReportsQuery`, `useWorkflowItemsQuery`,
      `usePostsQuery`, `useGroupsQuery`, `useGroupDetailQuery`, `useCommunityEventsQuery`,
      `useModerationLogQuery`) với server-side pagination params.
- [x] 1.4 Đăng ký route `/moderation/*` + `/community/*` vào router với permission guard
      (`community.report.view`, `workflow.review`, `community.modlog.view`, `community.post.view`,
      `group.view`, `community.event.review`) + nav items gated.

## 2. Moderation queue + log

- [x] 2.1 Trang `ModerationQueuePage` — tabs Posts/Comments/Resources, filter + search, bảng
      server-side pagination, empty/loading/error states.
- [x] 2.2 `ReportDetailDrawer` — snapshot nội dung, reporters, lịch sử xử lý.
- [x] 2.3 Mutation resolve (approve/reject/remove) với modal confirm + lý do bắt buộc; mutation
      escalate; xử lý 403/409; invalidate queries.
- [x] 2.4 Scope handling CTV: đọc scoped grants từ auth store, `useModerationScopeStore` +
      `ScopePicker` khi nhiều scope, tự gắn `scopeId` vào query.
- [x] 2.5 Trang `ModerationLogPage` — bảng chỉ đọc, filter actor/action/loại/thời gian,
      drawer detail.

## 3. Content workflow board

- [x] 3.1 `WorkflowBoardPage` — kanban 6 cột (dnd-kit), card component, filter + search.
- [x] 3.2 Transition guard: map transition→permission, chặn drop khi thiếu quyền (visual cue),
      optimistic update + rollback khi lỗi.
- [x] 3.3 `WorkflowItemDrawer` — chi tiết content item + lịch sử transition.

## 4. Posts management

- [x] 4.1 `PostsPage` — bảng server-side pagination/sort, search, filter group/trạng thái/pin/feature.
- [x] 4.2 Row actions Pin/Unpin, Feature/Unfeature, Hide/Unhide — mỗi nút gate theo permission leaf,
      Hide có confirm + lý do; invalidate list sau mutation.

## 5. Groups management

- [x] 5.1 `GroupsPage` — bảng list + search + filter trạng thái.
- [x] 5.2 `GroupDetailPage` — tabs Overview/Members/Posts/CTV assignments.
- [x] 5.3 Mutation Đổi owner (modal search user + confirm + lý do), Khoá/Mở khoá group
      (confirm + lý do), Gán/Thu hồi CTV (chọn user + tập permission subset).

## 6. Community events review

- [x] 6.1 `CommunityEventsPage` — bảng event pending/approved/rejected, search + filter, drawer
      chi tiết.
- [x] 6.2 Mutation Approve/Reject (reject bắt buộc lý do) + confirm modal + invalidate.

## 7. Verify

- [x] 7.1 `npm run build` xanh + `tsc --noEmit` sạch.
- [x] 7.2 Smoke test thủ công 4 flow trong design.md (resolve report, escalate CTV, kéo thả
      workflow, khoá group) với account từng tầng quyền.
