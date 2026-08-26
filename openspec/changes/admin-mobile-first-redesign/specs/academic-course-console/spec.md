# academic-course-console

## MODIFIED Requirements

### Requirement: Danh sách khoá học dùng được trên điện thoại

Trang danh sách khoá học SHALL trình bày kết quả theo cách bấm được bằng một ngón tay trên màn
375px, với việc "thêm học viên" là hành động nổi bật nhất trên mỗi khoá.

Lý do đổi: bảng cũ có 6 cột và hàng nút `size="small"`, trên điện thoại phải cuộn ngang mới thấy
thao tác, còn nút thì nhỏ hơn vùng chạm khuyến nghị.

#### Scenario: Tìm khoá bằng ô tìm lớn

- **WHEN** người dùng mở trang khoá học trên điện thoại
- **THEN** ô tìm chiếm trọn bề ngang, cao ít nhất 44px, có nút xoá nhanh
- **AND** gõ xong thì danh sách lọc theo từ khoá mà không cần bấm nút riêng

#### Scenario: Kết quả hiện dạng thẻ với nút thêm học viên đứng đầu

- **WHEN** danh sách khoá hiển thị trên điện thoại
- **THEN** mỗi khoá là một thẻ gồm tên, trạng thái, số học viên và giá
- **AND** nút "Thêm học viên" là nút chính, full-width, nằm TRƯỚC mọi thao tác khác của thẻ
- **AND** người dùng không có quyền cấp học viên thì không thấy nút đó

#### Scenario: Thao tác phụ không chiếm chỗ

- **WHEN** một thẻ khoá học hiển thị trên điện thoại
- **THEN** các thao tác ít dùng (xoá, đổi trạng thái) nằm trong menu phụ thay vì bày hết ra hàng nút
