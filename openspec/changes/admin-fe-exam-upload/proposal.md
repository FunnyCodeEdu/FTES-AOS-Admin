# admin-fe-exam-upload — Tab "Đề FE" trong chi tiết học liệu: xem trang + nạp đề

## Why

Album đề FE hiện chỉ nạp được từ màn HỌC VIÊN. Admin/CTV mở chi tiết một học liệu `type=FE` trong
console thì **không thấy nội dung của nó** — không biết album có bao nhiêu trang, trang nào là scan
trang nào là chữ — và muốn bổ sung đề thì phải rời console sang màn học viên.

## What Changes

- Tab **"Đề FE"** ở `ResourceDetailPage`, chỉ hiện với học liệu `type=FE` (thêm cho loại khác là
  mời người dùng bấm vào một màn hình chắc chắn rỗng).
- Danh sách trang: loại (Chữ / Ảnh scan), tên file gốc, trích đoạn nội dung với trang chữ.
- Hai nút nạp **tách bạch**: *file văn bản (.txt/.md)* và *số hoá ảnh đề thành chữ* — chúng làm hai
  việc ngược nhau với cùng một file, gộp thành công tắc là mời bấm nhầm.
- Cảnh báo tại chỗ: **số hoá ảnh KHÔNG giữ ảnh gốc**; muốn giữ nguyên trang scan thì dùng nút thêm
  ảnh ở màn học viên.

## Capabilities

### Modified Capabilities
- `admin-resources`: chi tiết học liệu FE xem và nạp được nội dung album đề.

## Impact
- Dùng `coreClient` (`/api/v1/resources/**` — bề mặt công khai dùng chung với FE học viên), KHÔNG
  `apiClient` (`/api/v1/admin/**`).
- Cần BE nhánh `feat/fe-text-exam-items` (đã merge) + `feat/fe-image-text-exams`.
