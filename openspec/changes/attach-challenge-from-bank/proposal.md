# "Thêm từ kho" ngay trong bài học — dùng lại thử thách của môn khác

## Why

Thử thách soạn ở môn A không thấy được khi đứng từ môn B.

Kho chung có thật và đủ (`/academic/challenge-bank`: search theo tiêu đề, lọc theo tag khớp GIAO,
lọc loại/độ khó/môn/khoá, modal *Đặt vào bài học*). BE `GET /admin/challenges/bank` để `subjectId`
và `courseId` đều tuỳ chọn.

Cái thiếu là **chiều ngược lại**. Đứng ở tab Bài tập của một bài học chỉ có hai đường:

1. **Thêm thử thách** → soạn MỚI.
2. Danh sách *"Thử thách chưa gắn (kho khoá học)"* → chỉ bài **chưa gắn** của **chính khoá đó**.

Bài của môn A không rơi vào đường nào. Muốn dùng lại phải đi vòng: mở kho → tìm → *Đặt vào bài học*
→ quay lại bài học.

## What Changes

- Nút **"Thêm từ kho"** cạnh "Thêm thử thách" trong `LessonExercisesCard`, mở modal chọn từ kho
  CHUNG: tìm theo tiêu đề, lọc tag, lọc loại, phân trang.
- Gắn bằng `POST /admin/challenges/{id}/placements` (**THÊM** chỗ dùng) chứ KHÔNG phải
  `PUT /admin/challenges/{id}/lesson` (**CHUYỂN**). Nhặt bài của môn A về môn B bằng đường PUT sẽ
  gỡ mất bài khỏi môn A — "dùng lại" hoá ra "lấy đi".
- **Không** lọc `onlyUnattached`, **không** ghim `subjectId`/`courseId`: bài cần tìm gần như luôn là
  bài đã gắn ở đâu đó, đó chính là định nghĩa của dùng lại.
- Bài đã có trong chính bài học này: hiện nhãn trạng thái thay cho nút.

## Impact

- Affected specs: `admin-challenge-bank-console`
- Affected code: `academic/exercises/components/AttachFromBankModal.tsx` (mới),
  `academic/lessons/components/LessonExercisesCard.tsx`
- Không đổi BE — dùng đúng endpoint kho + placements đã có.
