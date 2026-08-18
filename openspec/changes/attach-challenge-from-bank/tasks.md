# Tasks

- [x] 1.1 `AttachFromBankModal`: tìm tiêu đề + lọc tag + lọc loại + phân trang trên kho CHUNG
- [x] 1.2 Gắn bằng `POST /challenges/{id}/placements` (THÊM), không dùng `PUT /lesson` (CHUYỂN)
- [x] 1.3 Không gửi `onlyUnattached`/`subjectId`/`courseId`; bài đã có trong bài học hiện nhãn
- [x] 1.4 Nút "Thêm từ kho" cạnh "Thêm thử thách" trong `LessonExercisesCard`; gắn xong làm mới cả danh sách bài lẫn kho mồ côi
- [x] 2.1 Test hàm thuần: bộ lọc không mang 3 tham số cấm, đi qua buildBankQueryParams ra đúng query; nhận diện đã-có-trong-bài
- [x] 2.2 `tsc --noEmit` sạch + `npm run build` xanh
