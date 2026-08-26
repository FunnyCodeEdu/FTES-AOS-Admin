# admin-mobile-ux

## ADDED Requirements

### Requirement: Bộ primitive responsive dùng chung

Trang quản trị SHALL có một bộ component dùng chung để mọi màn hình danh sách hành xử giống nhau
trên điện thoại, thay vì mỗi trang tự chế một kiểu.

#### Scenario: Bảng đổi thành danh sách thẻ trên điện thoại

- **WHEN** một trang dùng `ResponsiveTable` và bề ngang màn hình nhỏ hơn breakpoint `md`
- **THEN** dữ liệu hiển thị dưới dạng danh sách thẻ dọc theo `renderMobileCard`, KHÔNG phải bảng cuộn ngang
- **AND** khi rộng hơn `md` thì hiển thị đúng `Table` antd với toàn bộ cột như cũ

#### Scenario: Vùng chạm đủ lớn

- **WHEN** một điều khiển chính (nút hành động, ô tìm, ô lọc) hiển thị trên điện thoại
- **THEN** chiều cao chạm được của nó tối thiểu 44px

#### Scenario: Modal nhiều trường mở dạng toàn màn hình

- **WHEN** một modal có form nhiều trường mở trên điện thoại
- **THEN** nó chiếm gần trọn viewport (rộng ≥ 96vw, sát mép trên) thay vì hộp nhỏ nổi giữa màn hình
- **AND** nút hành động chính nằm ở đáy, trong tầm ngón cái

### Requirement: Lối tắt việc hay làm trên trang chủ

Trang chủ quản trị SHALL hiển thị các lối tắt lớn tới ba việc mentor làm nhiều nhất, đặt TRÊN mọi
khối số liệu.

#### Scenario: Ba lối tắt hiển thị theo quyền

- **WHEN** người dùng mở trang chủ
- **THEN** thấy các thẻ "Thêm học viên vào khoá", "Xem lương", "Quản lí khoá học" mà họ có quyền vào
- **AND** thẻ nào thiếu quyền thì KHÔNG hiển thị

#### Scenario: Lối tắt lương trỏ đúng trang theo quyền

- **WHEN** người dùng có `payroll.manage`
- **THEN** thẻ "Xem lương" trỏ tới `/payroll`
- **WHEN** người dùng chỉ có `payroll.read`
- **THEN** thẻ "Xem lương" trỏ tới `/instructor/earnings`

#### Scenario: Thêm học viên đi thẳng vào việc

- **WHEN** người dùng bấm thẻ "Thêm học viên vào khoá"
- **THEN** mở thẳng bước chọn khoá học rồi tới ô dán danh sách username
- **AND** KHÔNG bắt đi vòng qua trang danh sách khoá rồi tự tìm nút
