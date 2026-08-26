# admin-dashboard-home

## MODIFIED Requirements

### Requirement: Trang chủ mở đầu bằng hành động, không phải số liệu

Trang chủ quản trị SHALL đặt khối lối tắt "Việc hay làm" ở trên cùng, trước lưới widget thống kê.

Lý do đổi: trên điện thoại, phần đầu màn hình là chỗ đắt nhất. Trước đây nó dành cho widget số liệu
chỉ để đọc, còn ba việc mentor thực sự làm mỗi ngày thì phải mở Drawer và cuộn tìm trong nav.

#### Scenario: Lối tắt nằm trên lưới widget

- **WHEN** người dùng mở trang chủ
- **THEN** khối "Việc hay làm" hiển thị trước, lưới widget thống kê nằm bên dưới

#### Scenario: Lối tắt xếp dọc trên điện thoại

- **WHEN** trang chủ hiển thị trên màn nhỏ hơn breakpoint `md`
- **THEN** mỗi lối tắt là một hàng full-width cao ít nhất 64px
- **AND** trên màn rộng thì các lối tắt xếp ngang cạnh nhau

#### Scenario: Widget lỗi không kéo theo lối tắt

- **WHEN** API widget thống kê hỏng
- **THEN** khối lối tắt vẫn hiển thị và bấm được, chỉ phần widget báo lỗi
