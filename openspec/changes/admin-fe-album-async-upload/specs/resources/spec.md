# Nạp đề FE — theo dõi việc chạy ngầm

## MODIFIED Requirements

### Requirement: Người soạn không bị giữ chân khi số hoá

#### Scenario: Nạp một bộ đề lớn
- **WHEN** người soạn nạp 51 trang ở chế độ ảnh→chữ
- **THEN** các lô được gửi liên tiếp không chờ nhau, và thông báo nói rõ trang đang được số hoá ngầm

#### Scenario: Theo dõi tiến độ
- **GIVEN** album còn trang `PENDING`
- **THEN** Admin tự làm mới album mỗi 5s và ngừng khi không còn trang nào `PENDING`
