# Đưa học liệu ra mắt từ màn Học liệu

## ADDED Requirements

### Requirement: Người soạn đưa được học liệu ra mắt ngay tại danh sách

#### Scenario: Học liệu vừa nạp xong
- **GIVEN** một học liệu ở trạng thái `DRAFT`
- **WHEN** người có quyền `admin.resource.manage` bấm "Đưa ra mắt" và xác nhận
- **THEN** học liệu chuyển sang `APPROVED` và hiện trên trang môn

#### Scenario: Học liệu đang chờ duyệt
- **GIVEN** một học liệu ở `PENDING_APPROVAL`
- **WHEN** bấm "Đưa ra mắt"
- **THEN** hệ thống bỏ qua bước gửi duyệt và chỉ duyệt — KHÔNG báo lỗi

#### Scenario: Học liệu đã ra mắt
- **THEN** nút không hiện, bất kể status tới dưới dạng `APPROVED` hay `approved`
