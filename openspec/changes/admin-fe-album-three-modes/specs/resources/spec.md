# Nạp đề FE — ba chế độ

## ADDED Requirements

### Requirement: Người soạn chọn đường nạp

Màn nạp đề FE SHALL cho người soạn chọn một trong ba chế độ trước khi chọn file, và SHALL nói rõ
mỗi chế độ cho ra loại trang nào.

#### Scenario: Chọn đường số hoá
- **GIVEN** người soạn có bộ đề chụp màn hình
- **WHEN** chọn chế độ "Ảnh → chữ (AI)" rồi nạp 51 trang
- **THEN** hệ thống gửi theo lô 3 file, và tiến độ báo theo TRANG (51), không theo lô (17)

#### Scenario: Ảnh gốc không được giữ lại
- **WHEN** người soạn đang ở chế độ "Ảnh → chữ (AI)"
- **THEN** giao diện SHALL nói rõ ảnh gốc không được lưu lại

#### Scenario: Đổi chế độ giữa chừng
- **GIVEN** người soạn đã chọn file ở một chế độ
- **WHEN** đổi sang chế độ khác
- **THEN** danh sách file đã chọn bị xoá, vì luật lọc file của hai chế độ khác nhau

### Requirement: Lô hỏng một phần không được báo thành công

#### Scenario: BE trả 200 kèm `failed`
- **WHEN** một lô có file không nạp được
- **THEN** lượt nạp SHALL dừng và hiện đúng tên file kèm lý do, KHÔNG cộng lô đó vào số trang đã nạp

## MODIFIED Requirements

### Requirement: Xem trước album

Mọi chỗ chiếu album FE SHALL rẽ nhánh theo `kind` của từng trang.

#### Scenario: Album trộn hai loại trang
- **GIVEN** một album có cả trang `IMAGE` lẫn trang `TEXT`
- **WHEN** người duyệt mở xem trước
- **THEN** trang `IMAGE` hiện ảnh, trang `TEXT` hiện trích đoạn chữ đọc được — không có ô ảnh vỡ
