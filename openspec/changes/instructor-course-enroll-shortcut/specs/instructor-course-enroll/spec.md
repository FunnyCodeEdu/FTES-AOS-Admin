# instructor-course-enroll

## ADDED Requirements

### Requirement: Cấp học viên ngay trong danh sách khoá của tôi

Trang **Khoá của tôi** SHALL cho phép cấp học viên vào một khoá ngay tại dòng của khoá đó, không bắt
người dùng đi vòng sang khu quản trị khoá học.

#### Scenario: Cấp học viên từ danh sách

- **WHEN** người dùng bấm "Thêm học viên" ở một khoá trong danh sách
- **THEN** mở đúng luồng cấp hàng loạt theo username đang dùng ở khu quản trị
- **AND** cấp xong thì báo kết quả theo từng username như luồng đó vẫn làm

#### Scenario: Không có quyền thì không thấy nút

- **WHEN** người dùng không có quyền `admin.course.manage`
- **THEN** nút "Thêm học viên" không hiển thị
- **AND** người dùng vẫn mở được khoá để soạn nội dung như trước

#### Scenario: Điện thoại

- **WHEN** danh sách hiển thị trên màn nhỏ hơn breakpoint `md`
- **THEN** mỗi khoá là một thẻ với nút "Thêm học viên" full-width đứng trước thao tác khác
