# academic-course-console

## ADDED Requirements

### Requirement: Tab Giá & gói quản lý gói thật của khoá

Tab "Giá & gói" của trang chi tiết khoá SHALL đọc danh sách gói từ
`GET /courses/{id}/packages/admin` và hiển thị mọi gói kèm status, giá, thứ tự, cờ gói mặc định và
danh sách entitlement. Form SHALL KHÔNG hiển thị bất kỳ trường gói nào mà thao tác lưu không gửi tới
BE.

Mỗi gói SHALL lưu độc lập: thêm gói gọi `POST /courses/{id}/packages`, sửa gọi
`PATCH /courses/{id}/packages/{packageId}`, ngừng bán gọi `DELETE /courses/{id}/packages/{packageId}`
sau một hộp thoại xác nhận. Nút "Lưu pricing" SHALL chỉ gửi `totalPrice` và SHALL KHÔNG còn nhận
trách nhiệm lưu gói.

Mọi thao tác ghi SHALL nằm trong `<Can permissions={["course.manage"]}>` và bị vô hiệu khi `readOnly`.
Sau mỗi thao tác thành công, query chi tiết khoá và danh sách gói SHALL được invalidate.

#### Scenario: Thêm gói mới
- **WHEN** admin bấm "Thêm gói", nhập tên "Gói Premium", slug `premium`, giá 700000 và bấm lưu gói đó
- **THEN** FE gọi `POST /courses/{id}/packages` đúng một lần với các giá trị đó
- **AND** gói mới xuất hiện trong danh sách sau khi query được invalidate

#### Scenario: Không còn lưu ngầm thất bại
- **WHEN** admin sửa tên một gói rồi bấm "Lưu pricing"
- **THEN** hệ thống KHÔNG âm thầm bỏ qua thay đổi đó — hoặc thay đổi được lưu qua lệnh PATCH của gói,
  hoặc UI chỉ rõ gói phải lưu bằng nút riêng của nó

#### Scenario: Ngừng bán gói có xác nhận
- **WHEN** admin bấm xoá một gói
- **THEN** một hộp thoại xác nhận hiện ra nêu rõ gói sẽ ngừng bán nhưng học viên đã mua vẫn giữ quyền
- **AND** chỉ khi xác nhận thì `DELETE` mới được gọi

### Requirement: Chọn entitlement bằng cây khoá học

Trong mỗi gói, entitlement SHALL được nhập bằng các điều khiển có ràng buộc, KHÔNG bằng ô văn bản tự
do: mỗi dòng chọn `type` là `PART` hoặc `LESSON`; `PART` chọn một section, `LESSON` chọn một hoặc
nhiều bài; mỗi dòng có thêm ô chọn nhiều bài "học thử miễn phí" ánh xạ sang `freeLessonIds`. Nguồn dữ
liệu section/bài SHALL là `course.tree` của khoá đang mở. Payload gửi lên SHALL đúng hình dạng
`CreateEntitlementRequest` của BE.

#### Scenario: Gói trọn phần
- **WHEN** admin thêm entitlement `PART` và chọn section "Phần 1"
- **THEN** payload chứa `{ type: "PART", sectionId: "<id Phần 1>" }` và không có `selectedLessonIds`

#### Scenario: Gói chọn bài lẻ kèm bài học thử
- **WHEN** admin thêm entitlement `LESSON`, chọn 3 bài và đánh dấu 1 bài là học thử miễn phí
- **THEN** payload chứa `selectedLessonIds` gồm 3 id và `freeLessonIds` gồm 1 id

### Requirement: Đổi loại khoá LEGACY sang PACKAGE phải cảnh báo một chiều

Khi admin chọn `PACKAGE` cho một khoá đang là `LEGACY` ở tab Tổng quan, hệ thống SHALL hiện hộp thoại
xác nhận trước khi gọi `PATCH /courses/{id}`, nêu rõ: thao tác KHÔNG hoàn tác được (BE cấm hạ về
LEGACY), khoá sẽ chuyển sang bán theo gói, hệ thống tự tạo gói "Trọn khoá" và giữ nguyên quyền học của
học viên đang học. Huỷ hộp thoại SHALL trả select về giá trị cũ và không gửi request.

#### Scenario: Huỷ xác nhận
- **WHEN** admin chọn PACKAGE rồi bấm Huỷ trong hộp thoại
- **THEN** không có request nào được gửi và select hiển thị lại `LEGACY`

#### Scenario: Khoá LEGACY chưa thể quản gói
- **WHEN** mở tab "Giá & gói" của một khoá `LEGACY`
- **THEN** khu vực gói ở trạng thái chỉ đọc kèm chỉ dẫn đổi loại khoá ở tab Tổng quan
- **AND** không có nút thêm/sửa/xoá gói nào bấm được
