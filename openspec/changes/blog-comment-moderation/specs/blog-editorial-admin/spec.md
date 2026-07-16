# blog-editorial-admin — Delta

## ADDED Requirements

### Requirement: Post list uses server-side published filter and real total
`useBlogPosts` SHALL gửi filter trạng thái xuất bản lên BE qua query param `published` của
`GET /api/v1/blog/admin/posts` (bỏ hẳn bước lọc client-side trên trang hiện tại), và SHALL
lấy `total` cho pagination antd từ field `totalElements` của response; khi BE chưa trả
field này (null/vắng — BE chưa deploy delta `blog-admin-filter-and-engagement-seed`) SHALL
fallback về heuristic `hasNext` hiện có thay vì vỡ trang.

#### Scenario: Lọc bản nháp đúng trên mọi trang
- **GIVEN** hệ thống có bản nháp nằm ngoài trang đầu của danh sách tổng
- **WHEN** admin chọn filter "Bản nháp"
- **THEN** request mang `published=false` và bảng hiển thị đủ các bản nháp theo phân trang server-side (không còn cảnh trang đầu rỗng dù còn nháp ở trang sau)

#### Scenario: Total thật từ BE
- **GIVEN** BE đã trả `totalElements`
- **WHEN** danh sách tải xong
- **THEN** pagination antd hiển thị đúng tổng số bài khớp filter (không còn total suy diễn từ `hasNext`)

#### Scenario: Tương thích BE cũ
- **GIVEN** BE chưa có `totalElements`
- **WHEN** danh sách tải
- **THEN** UI dùng lại heuristic `hasNext` cũ để vẫn bấm được trang kế tiếp, không lỗi runtime
