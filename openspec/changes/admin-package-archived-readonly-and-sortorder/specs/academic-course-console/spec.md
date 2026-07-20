# academic-course-console

## ADDED Requirements

### Requirement: Gói đã ngừng bán chỉ đọc và kích hoạt lại an toàn

Card của gói có `status = ARCHIVED` trong tab "Giá & gói" SHALL ở chế độ chỉ đọc: hiển thị chip
trạng thái "Ngừng bán", vô hiệu mọi ô nhập, và KHÔNG render nút "Lưu gói", "Ngừng bán",
"Thêm entitlement" hay icon xoá dòng entitlement.

Card gói ARCHIVED SHALL cung cấp nút "Kích hoạt lại" (có xác nhận) gọi
`PATCH /courses/{id}/packages/{packageId}` với body chỉ gồm `{ "status": "ACTIVE" }`. Body SHALL
KHÔNG chứa `entitlements`, vì backend xoá sạch entitlement cũ rồi ghi lại theo mảng gửi lên — gửi
mảng thiếu là xoá quyền của học viên đã mua gói.

#### Scenario: Gói ARCHIVED không có nút ghi
- **WHEN** admin mở tab "Giá & gói" của khoá có một gói `status = ARCHIVED`
- **THEN** card gói đó hiện chip "Ngừng bán", các ô nhập bị vô hiệu
- **AND** không có nút "Lưu gói", "Ngừng bán" hay "Thêm entitlement" trên card đó

#### Scenario: Kích hoạt lại không đụng entitlement
- **WHEN** admin bấm "Kích hoạt lại" và xác nhận
- **THEN** FE gọi `PATCH /courses/{id}/packages/{packageId}` với body đúng bằng `{ status: "ACTIVE" }`
- **AND** body KHÔNG có khoá `entitlements`, `name`, `slug` hay bất kỳ field nào khác

#### Scenario: Gói ACTIVE không đổi hành vi
- **WHEN** admin mở một gói `status = ACTIVE`
- **THEN** card vẫn có đủ "Lưu gói", "Ngừng bán", "Thêm entitlement" như trước
- **AND** không hiện nút "Kích hoạt lại"

### Requirement: Gói mới mặc định sortOrder kế tiếp

Card "Gói mới" SHALL prefill ô "Thứ tự" bằng `max(sortOrder của các gói hiện có) + 1`, coi
`sortOrder` null/thiếu là `0`; khoá chưa có gói nào thì giá trị mặc định là `0`. Payload `POST`
tạo gói SHALL luôn mang field `sortOrder`, để backend không rơi về mặc định `0` trùng với gói
"Trọn khoá" sẵn có.

#### Scenario: Khoá đã có gói
- **WHEN** khoá có các gói `sortOrder` = 0 và 2, admin bấm "Thêm gói"
- **THEN** ô "Thứ tự" của card gói mới hiện sẵn giá trị 3

#### Scenario: Khoá chưa có gói nào
- **WHEN** khoá chưa có gói nào và admin bấm "Thêm gói"
- **THEN** ô "Thứ tự" hiện sẵn giá trị 0

#### Scenario: Payload tạo gói luôn có sortOrder
- **WHEN** admin lưu card gói mới mà không sửa ô "Thứ tự"
- **THEN** body `POST /courses/{id}/packages` chứa `sortOrder` đúng bằng giá trị đã prefill
