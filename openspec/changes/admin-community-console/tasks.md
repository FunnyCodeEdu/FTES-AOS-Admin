# Tasks — admin-community-console

## 1. Khung feature & API layer

- [ ] 1.1 Tạo feature folder `src/features/moderation/` và `src/features/community/`
      (pages + api + components) theo convention `docs/ADMIN-ARCHITECTURE.md`.
- [ ] 1.2 Viết API client module `src/features/moderation/api/moderation.api.ts` và
      `src/features/community/api/community.api.ts` (typed request/response, envelope).
- [ ] 1.3 Khai báo query keys + hooks TanStack Query (`useReportsQuery`, `useWorkflowItemsQuery`,
      `usePostsQuery`, `useGroupsQuery`, `useGroupDetailQuery`, `useCommunityEventsQuery`,
      `useModerationLogQuery`) với server-side pagination params.
- [ ] 1.4 Đăng ký route `/moderation/*` + `/community/*` vào router với permission guard
      (`community.report.view`, `workflow.review`, `community.modlog.view`, `community.post.view`,
      `group.view`, `community.event.review`) + nav items gated.

## 2. Moderation queue + log

- [ ] 2.1 Trang `ModerationQueuePage` — tabs Posts/Comments/Resources, filter + search, bảng
      server-side pagination, empty/loading/error states.
- [ ] 2.2 `ReportDetailDrawer` — snapshot nội dung, reporters, lịch sử xử lý.
- [ ] 2.3 Mutation resolve (approve/reject/remove) với modal confirm + lý do bắt buộc; mutation
      escalate; xử lý 403/409; invalidate queries.
- [ ] 2.4 Scope handling CTV: đọc scoped grants từ auth store, `useModerationScopeStore` +
      `ScopePicker` khi nhiều scope, tự gắn `scopeId` vào query.
- [ ] 2.5 Trang `ModerationLogPage` — bảng chỉ đọc, filter actor/action/loại/thời gian,
      drawer detail.

## 3. Content workflow board

- [ ] 3.1 `WorkflowBoardPage` — kanban 6 cột (dnd-kit), card component, filter + search.
- [ ] 3.2 Transition guard: map transition→permission, chặn drop khi thiếu quyền (visual cue),
      optimistic update + rollback khi lỗi.
- [ ] 3.3 `WorkflowItemDrawer` — chi tiết content item + lịch sử transition.

## 4. Posts management

- [ ] 4.1 `PostsPage` — bảng server-side pagination/sort, search, filter group/trạng thái/pin/feature.
- [ ] 4.2 Row actions Pin/Unpin, Feature/Unfeature, Hide/Unhide — mỗi nút gate theo permission leaf,
      Hide có confirm + lý do; invalidate list sau mutation.

## 5. Groups management

- [ ] 5.1 `GroupsPage` — bảng list + search + filter trạng thái.
- [ ] 5.2 `GroupDetailPage` — tabs Overview/Members/Posts/CTV assignments.
- [ ] 5.3 Mutation Đổi owner (modal search user + confirm + lý do), Khoá/Mở khoá group
      (confirm + lý do), Gán/Thu hồi CTV (chọn user + tập permission subset).

## 6. Community events review

- [ ] 6.1 `CommunityEventsPage` — bảng event pending/approved/rejected, search + filter, drawer
      chi tiết.
- [ ] 6.2 Mutation Approve/Reject (reject bắt buộc lý do) + confirm modal + invalidate.

## 7. Verify

- [ ] 7.1 `npm run build` xanh + `tsc --noEmit` sạch.
- [ ] 7.2 Smoke test thủ công 4 flow trong design.md (resolve report, escalate CTV, kéo thả
      workflow, khoá group) với account từng tầng quyền.
