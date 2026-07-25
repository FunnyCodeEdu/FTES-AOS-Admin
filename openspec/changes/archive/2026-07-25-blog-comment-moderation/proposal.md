# blog-comment-moderation — Màn kiểm duyệt comment blog + list posts filter/total thật

## Why

Module Blog admin (change `content-management-console`) mới phủ posts + categories:

1. **Chưa có màn kiểm duyệt comment** — BE đã mở `PUT /blog/comments/{id}` +
   `DELETE /blog/comments/{id}` cho quyền `blog.manage` (mod sửa/xoá comment bất kỳ), nhưng
   Admin không có UI: comment rác/vi phạm trên blog không xử lý được.
2. **List bài viết đang "chống chế" phía client** — `blog.api.ts` (`useBlogPosts`) lọc
   `published` client-side trên 1 trang và **fake `total`** từ `hasNext`
   (`blog.api.ts:89`). BE delta `blog-admin-filter-and-engagement-seed` (FTES-AOS-Backend)
   bổ sung param `published` + `totalElements` — Admin cần wire lại cho thật.

## What Changes

- **`useBlogPosts`**: gửi `published` lên `GET /blog/admin/posts` (server-side filter, đúng
  kết quả mọi trang); `total` lấy từ `totalElements` của response, fallback heuristic
  `hasNext` cũ khi BE chưa deploy delta (field vắng/null).
- **Màn comment theo bài** (mới): route `/content/blog/:id/comments`
  (`BlogCommentsPage`, quyền `blog.manage`, KHÔNG thêm menu — vào từ nút "Bình luận" trên
  hàng của `BlogListPage`):
  - Bảng comment của bài (`GET /blog/posts/{postId}/comments`, phân trang prev/next theo
    `hasNext` — `CommentPage` không có total): người viết (`authorUsername`, fallback
    `userId`), nội dung, số tim, thời gian.
  - **Ẩn/biên tập nội dung**: modal sửa `content` → `PUT /blog/comments/{id}` (che nội dung
    vi phạm, giữ dấu vết).
  - **Xoá**: `Modal.confirm` danger → `DELETE /blog/comments/{id}`.

## Capabilities

### New Capabilities
- `blog-comment-moderation`: bảng comment theo bài + sửa/xoá với quyền `blog.manage`.

### Modified Capabilities (spec `blog-editorial-admin` thuộc change `content-management-console` chưa archive → delta viết dạng ADDED requirement, không đè)
- `blog-editorial-admin`: +1 requirement — list posts dùng filter `published` + total server-side.

## Impact

- Sửa: `src/features/content/blog/api/blog.api.ts` (`useBlogPosts` + hooks comment mới),
  `api/blog.keys.ts` (key comments), `types.ts` (`BlogComment`, `totalElements`),
  `pages/BlogListPage.tsx` (nút "Bình luận"), `src/app/routeRegistry.tsx` (route mới).
- Mới: `src/features/content/blog/pages/BlogCommentsPage.tsx`.
- Không dependency mới; quyền dùng lại `blog.manage` (đã seed BE).
- Phụ thuộc BE: delta `blog-admin-filter-and-engagement-seed` (param `published`,
  `totalElements`, `authorUsername`) — UI có fallback nên deploy trước BE vẫn không vỡ.
