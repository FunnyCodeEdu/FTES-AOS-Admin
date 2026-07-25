# blog-comment-moderation — Delta

## ADDED Requirements

### Requirement: Per-post comment moderation screen
Admin SHALL có màn kiểm duyệt comment theo bài tại route `/content/blog/:id/comments`
(layout admin, yêu cầu quyền `blog.manage`, KHÔNG có mục menu riêng — vào từ nút
"Bình luận" trên mỗi hàng của danh sách bài viết). Màn SHALL hiển thị tiêu đề bài viết,
bảng comment của bài (`GET /api/v1/blog/posts/{postId}/comments`) với cột người viết
(`authorUsername`, fallback `userId` rút gọn khi null), nội dung (ellipsis mở rộng được),
số tim, thời gian tạo; phân trang bằng cặp nút Trước/Sau theo `hasNext` (response không có
total).

#### Scenario: Vào màn từ danh sách bài
- **GIVEN** admin có `blog.manage` đang ở `/content/blog`
- **WHEN** bấm "Bình luận" trên một bài có comment seed
- **THEN** điều hướng tới `/content/blog/<id>/comments` và bảng hiển thị các comment của đúng bài đó

#### Scenario: Thiếu quyền bị chặn
- **WHEN** tài khoản không có `blog.manage` truy cập thẳng `/content/blog/<id>/comments`
- **THEN** route bị chặn theo cơ chế `requiredPermissions` chung của registry (không render trang)

#### Scenario: Phân trang theo hasNext
- **GIVEN** bài có nhiều hơn 20 comment
- **WHEN** admin bấm "Trang sau"
- **THEN** bảng tải trang kế tiếp; "Trang sau" disabled khi `hasNext` là false và "Trang trước" disabled ở trang 0

### Requirement: Hide-or-edit and delete a comment
Từ bảng comment, admin giữ `blog.manage` SHALL ẩn/biên tập được nội dung một comment qua
modal sửa `content` (TextArea max 5000, có nút chèn nhanh ghi chú kiểm duyệt) gọi
`PUT /api/v1/blog/comments/{id}`, và xoá hẳn comment qua `Modal.confirm` danger gọi
`DELETE /api/v1/blog/comments/{id}`. Sau mỗi thao tác thành công UI SHALL invalidate query
comment của bài (bảng tự refetch) và hiện toast thành công; lỗi đi qua
`handleAdminMutationError`.

#### Scenario: Ẩn nội dung vi phạm
- **WHEN** admin mở "Ẩn/biên tập" một comment, thay nội dung bằng ghi chú kiểm duyệt và lưu
- **THEN** `PUT /blog/comments/{id}` được gọi với content mới và bảng hiển thị nội dung đã thay (FE learner cũng thấy nội dung mới)

#### Scenario: Xoá comment
- **WHEN** admin bấm Xoá và xác nhận trong hộp thoại danger
- **THEN** `DELETE /blog/comments/{id}` được gọi, dòng biến mất khỏi bảng sau refetch và toast thành công hiện ra

#### Scenario: Lỗi mutation hiển thị chuẩn
- **GIVEN** BE trả lỗi (ví dụ comment đã bị xoá trước đó → 404)
- **WHEN** admin lưu/xoá
- **THEN** lỗi đi qua `handleAdminMutationError` (message envelope), bảng không vỡ

## Seed data

- Repo Admin không có migration. Dữ liệu demo cho màn này do BE FTES-AOS-Backend seed:
  `V201__seed_blog_from_legacy.sql` (19 bài published) + `V215__seed_blog_engagement_demo.sql`
  (change `blog-admin-filter-and-engagement-seed`: 3 comment + reactions cho 5 bài mới
  nhất, idempotent `ON CONFLICT DO NOTHING`) — deploy test mở màn moderation là có comment
  để ẩn/xoá ngay.
