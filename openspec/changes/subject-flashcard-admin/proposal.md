# Quản bộ thẻ ghi nhớ của môn trong admin

## Why

Kho flashcard theo môn vừa nạp 24.165 thẻ trên 198 môn và được khoá sau gói hội viên
30k/tháng. Nhưng tạo/sửa bộ thẻ hiện chỉ làm được bằng **script** hoặc **gọi API tay** — người
vận hành không có chỗ nào để thêm một bộ mới, sửa bậc trả phí hay đổi số thẻ học thử.

## What Changes

- Tab **Flashcards** trong trang chi tiết môn: danh sách bộ (số thẻ, bậc, trạng thái),
  tạo/sửa/xoá bộ, và xem/thêm/xoá thẻ trong bộ.
- Đặt được `accessTier` (FREE|PREMIUM) và `previewLimit` — hai cần gạt kinh doanh, sửa ở đây
  là có hiệu lực ngay vì chúng nằm ở DB chứ không phải hằng số trong code.
- Nhập thẻ hàng loạt: mỗi dòng một thẻ, ngăn mặt trước/mặt sau bằng `|`.

Gọi qua `coreClient` (`/api/v1/subjects/{code}/practice/flashcards`) vì bộ thẻ sống ở service
Workspace, KHÔNG dưới `/admin`; quyền là quyền curate môn mà tài khoản admin đã có.

## Impact

- Affected code: `features/academic/subjects` (api + components + trang chi tiết).
- Không đổi BE: dùng đúng endpoint đã có.
