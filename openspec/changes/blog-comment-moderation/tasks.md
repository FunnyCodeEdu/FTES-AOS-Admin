# Tasks — blog-comment-moderation

## 1. List posts: filter `published` + total thật
- [x] 1.1 `features/content/blog/api/blog.api.ts` (`useBlogPosts`): thêm `published` vào
      params request; bỏ `.filter(...)` client-side; `total = totalElements ?? fallback
      heuristic hasNext cũ` (design §1).
- [x] 1.2 `types.ts`: mở rộng kiểu raw page (`totalElements?: number | null`).
- [~] 1.3 Vòng chất lượng tính năng: unit test (mapper total: có totalElements / null /
      vắng field; params gửi published đúng 3 trạng thái) ✅ 10 test xanh + e2e test (apitest: filter Bản
      nháp ra đúng kết quả đa trang, pagination hiển thị tổng thật — CHỜ apitest live) → đánh giá vòng 1 →
      fix → đánh giá vòng 2.

## 2. API + keys comment
- [x] 2.1 `types.ts`: `BlogComment`, `BlogCommentPage` (design §2).
- [x] 2.2 `blog.keys.ts`: `comments(postId)` + `commentList(postId, page, size)`.
- [x] 2.3 `blog.api.ts`: `useBlogComments(postId, page, size)` (enabled theo postId,
      placeholderData giữ trang cũ), `useUpdateBlogComment(postId)`,
      `useDeleteBlogComment(postId)` — invalidate `blogKeys.comments(postId)`,
      `onError: handleAdminMutationError`.

## 3. Màn `BlogCommentsPage` + wiring
- [x] 3.1 `pages/BlogCommentsPage.tsx`: header title bài (`useBlogPost`) + nút quay lại;
      bảng cột người viết (`authorUsername` fallback `userId` rút gọn + Tooltip), nội dung
      (ellipsis expandable, pre-wrap), tim, thời gian; phân trang Trước/Sau theo `hasNext`
      (design §3).
- [x] 3.2 Hành động bọc `<Can permissions={["blog.manage"]}>`: modal "Ẩn/biên tập" (TextArea
      max 5000 + nút chèn ghi chú kiểm duyệt → `useUpdateBlogComment`) + Xoá
      (`Modal.confirm` danger → `useDeleteBlogComment`); toast success sau mutation.
- [x] 3.3 `routeRegistry.tsx`: route `/content/blog/:id/comments`
      (`requiredPermissions: ["blog.manage"]`, không `nav`).
- [x] 3.4 `pages/BlogListPage.tsx`: nút "Bình luận" trên cột hành động →
      navigate `/content/blog/{id}/comments`.
- [~] 3.5 Vòng chất lượng tính năng: unit test (`BlogCommentsPage.test.ts` — fallback
      authorUsername null→id rút gọn; canGoPrev/canGoNext biên hasNext; clampCommentSize cap
      50) ✅ 12 test xanh (tổng 22 với task 1) + e2e test (apitest `blog.manage`: mở từ list →
      thấy comment seed → ẩn 1 → xoá 1; thiếu quyền chặn route — CHỜ apitest live) → đánh giá
      vòng 1 → fix → đánh giá vòng 2.

## 4. Verify chung
- [~] 4.1 `tsc --noEmit` sạch (EXIT 0); `content/blog`+`routeRegistry` cũng sạch dưới `tsc -b`.
      LƯU Ý: `npm run build` (tsc -b) đỏ ~100 lỗi `noImplicitAny` CÓ SẴN ở file ngoài lane
      (operations/rbac/users/providers) — đã log `docs/BACKLOG-REVIEW-lane-blog.md`, không sửa.
- [x] 4.2 `openspec validate blog-comment-moderation --strict` pass.
