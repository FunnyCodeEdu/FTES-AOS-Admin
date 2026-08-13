# admin-paper-multifile — Đính NHIỀU file cho đề PE (ảnh/PDF xem + template tải về)

## Why

Một đề PE thật gồm **ảnh/PDF đề** (thí sinh ĐỌC) **kèm template `.zip`/`.docx`/`.xlsx`** (thí sinh
TẢI VỀ làm bài). Hiện `ChallengePaperModal` cho chọn cả thư mục nhưng **nén hết thành MỘT ZIP** rồi
upload — nên đề và template lẫn một cục, thí sinh phải tải về giải nén mới đọc được, không xem inline
được trang nào.

Ngoài ra tạo một đề đang tốn **3 lượt gọi API** (tạo → gắn tag → up đề) kèm cả nhánh khôi phục
"đã tạo nhưng chưa gắn tag, bấm thử lại, đừng tạo trùng" — vì tag chỉ được điền sẵn ở form rồi lưu
bằng lệnh riêng.

## What Changes

- `ChallengePaperModal`: **chọn nhiều file** (giữ nguyên lối chọn cả thư mục), upload qua endpoint
  nhiều-file mới; danh sách hiện **nhãn vai** (Xem tại chỗ / Tải về, do server suy từ MIME), **sắp
  xếp** và **xoá từng file**.
- `CreateBankChallengeModal`: gửi `tags` **trong chính lượt tạo** → xoá nhánh khôi phục lỗi giữa chừng.
- Không đụng trang Học liệu (`Loại = PE` giữ nguyên theo quyết định).

## Capabilities

### New Capabilities
- `admin-paper-multifile`: quản bộ file đề nhiều-tệp (thêm/sắp/xoá, nhãn vai) + tạo đề kèm tag một lượt.

## Impact
`ChallengePaperModal`, `CreateBankChallengeModal`, `challengeBankConsole.api.ts` (+`paperFiles` hooks),
`types.ts`. Phụ thuộc BE change `challenge-paper-multifile`.
