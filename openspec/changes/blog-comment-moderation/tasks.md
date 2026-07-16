# Tasks — blog-comment-moderation

## 1. List posts: filter `published` + total thật
- [ ] 1.1 `features/content/blog/api/blog.api.ts` (`useBlogPosts`): thêm `published` vào
      params request; bỏ `.filter(...)` client-side; `total = totalElements ?? fallback
      heuristic hasNext cũ` (design §1).
- [ ] 1.2 `types.ts`: mở rộng kiểu raw page (`totalElements?: number | null`).
- [ ] 1.3 Vòng chất lượng tính năng: unit test (mapper total: có totalElements / null /
      vắng field; params gửi published đúng 3 trạng thái) + e2e test (apitest: filter Bản
      nháp ra đúng kết quả đa trang, pagination hiển thị tổng thật) → đánh giá vòng 1 →
      fix → đánh giá vòng 2.

## 2. API + keys comment
- [ ] 2.1 `types.ts`: `BlogComment`, `BlogCommentPage` (design §2).
- [ ] 2.2 `blog.keys.ts`: `comments(postId)` + `commentList(postId, page, size)`.
- [ ] 2.3 `blog.api.ts`: `useBlogComments(postId, page, size)` (enabled theo postId,
      placeholderData giữ trang cũ), `useUpdateBlogComment(postId)`,
      `useDeleteBlogComment(postId)` — invalidate `blogKeys.comments(postId)`,
      `onError: handleAdminMutationError`.

## 3. Màn `BlogCommentsPage` + wiring
- [ ] 3.1 `pages/BlogCommentsPage.tsx`: header title bài (`useBlogPost`) + nút quay lại;
      bảng cột người viết (`authorUsername` fallback `userId` rút gọn + Tooltip), nội dung
      (ellipsis expandable, pre-wrap), tim, thời gian; phân trang Trước/Sau theo `hasNext`
      (design §3).
- [ ] 3.2 Hành động bọc `<Can permissions={["blog.manage"]}>`: modal "Ẩn/biên tập" (TextArea
      max 5000 + nút chèn ghi chú kiểm duyệt → `useUpdateBlogComment`) + Xoá
      (`Modal.confirm` danger → `useDeleteBlogComment`); toast success sau mutation.
- [ ] 3.3 `routeRegistry.tsx`: route `/content/blog/:id/comments`
      (`requiredPermissions: ["blog.manage"]`, không `nav`).
- [ ] 3.4 `pages/BlogListPage.tsx`: nút "Bình luận" trên cột hành động →
      navigate `/content/blog/{id}/comments`.
- [ ] 3.5 Vòng chất lượng tính năng: unit test (render bảng với authorUsername null →
      fallback id; nút Trước/Sau disabled đúng biên; modal submit gọi đúng endpoint) +
      e2e test (apitest tài khoản `blog.manage`: mở màn từ list → thấy comment seed → ẩn 1
      comment thấy nội dung đổi → xoá 1 comment biến mất; tài khoản thiếu quyền bị chặn
      route) → đánh giá vòng 1 → fix → đánh giá vòng 2.

## 4. Verify chung
- [ ] 4.1 `npm run build` + `tsc --noEmit` sạch.
- [ ] 4.2 `openspec validate blog-comment-moderation --strict` pass.
