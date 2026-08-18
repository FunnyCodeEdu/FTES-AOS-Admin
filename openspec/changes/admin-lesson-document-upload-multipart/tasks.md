## 1. Sửa lời gọi

- [x] 1.1 Popup "Bài học mới" (`useCreateLesson`) gửi tài liệu kèm theo bằng multipart.
- [x] 1.2 Màn soạn bài học (`useUploadLessonDocument`) gửi multipart.
- [x] 1.3 Ghi chú tại chỗ nói rõ vì sao phải xoá mặc định JSON, để lần sau không ai "dọn" nó đi.

## 2. Khoá bằng test

- [x] 2.1 Test đi qua `coreClient` thật với adapter giả, khẳng định body tới tầng gửi còn là FormData.
- [x] 2.2 Test bắt đúng lỗi cũ: nếu bỏ phần ghi đè header thì test phải đỏ.

## 3. Kiểm chứng

- [x] 3.1 `npm run typecheck` sạch.
- [x] 3.2 `npx vitest run` xanh.
- [x] 3.3 `npm run build` xanh.
