# Ô chọn môn tìm ở SERVER, để chạm được môn ngoài 100 dòng đầu

## Why

`adminSubjects` có **trần cứng 100 dòng** mỗi trang. `SubjectSelect` xin `pageSize: 1000` rồi lọc
bằng `filterOption` phía client, tin rằng đã cầm đủ danh mục — nhưng danh mục có **465 môn**, nên
365 môn nằm ngoài 100 dòng đầu **không bao giờ xuất hiện**.

Hệ quả đo được: mở "Tạo đề vào kho", gõ `WED201c` → danh sách rỗng → không chọn được môn → không
tạo được đề PE cho môn đó. Màn hình không báo lỗi gì; nó hiện "không có dữ liệu" y hệt trường hợp
môn không tồn tại, nên người vận hành không có manh mối nào.

Ô này dùng chung ở 4 màn (tạo đề vào kho, sửa nhanh đề, lọc quiz, danh sách khoá học) — tất cả
cùng dính.

## What Changes

- `SubjectSelect` tìm bằng `filter.q` **ở server**, gõ xong 300ms mới hỏi (`filterOption={false}`
  để antd không lọc chồng lên kết quả server).
- Giữ nhãn của môn ĐANG CHỌN kể cả khi nó rơi khỏi kết quả tìm hiện tại — không giữ thì ô select
  hiện trơ một UUID, trông như dữ liệu hỏng.
- `notFoundContent` phân biệt "đang tìm" với "không có môn khớp".

## Impact

- Affected code: `features/academic/components/SubjectSelect.tsx` (dùng chung 4 màn).
- Không đổi BE: `AdminSubjectFilter.q` đã có sẵn và chạy đúng.
