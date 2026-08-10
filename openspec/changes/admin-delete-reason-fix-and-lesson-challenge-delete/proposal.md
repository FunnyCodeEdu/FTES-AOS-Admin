## Why

Tiếp nối đợt thêm nút xoá:
1. **Xoá môn học / học liệu đang HỎNG** — hook gọi `apiClient.delete(url)` KHÔNG gửi body, trong khi
   BE `DELETE /admin/subjects/{id}` + `/admin/resources/{id}` gác `requireReason` (@RequestBody
   ReasonBody) → luôn 400. Xoá không bao giờ chạy.
2. **Challenge chỉ xoá được ở tab Kho** — panel thực hành theo bài (LessonExercisesCard, nút "+") chưa
   có nút xoá challenge; người dùng hay ở panel này.

(Xoá bảng lương: đã phân tích — KHÔNG hard-delete được an toàn, xem báo cáo riêng.)

## What Changes

- `useDeleteSubject` / `useDeleteResource` nhận `{ id, reason }`, gửi `{ reason }` vào body DELETE;
  UI `SubjectListPage` / `ResourceListPage` chuyển từ `Modal.confirm` (không có ô lý do) sang
  `DeleteConfirmModal` (ô lý do bắt buộc) → xoá chạy đúng + có audit.
- `LessonExercisesCard`: thêm nút **Xoá** (danger, gate challenge.manage) trên mỗi hàng challenge
  (cả đã-gắn lẫn kho chưa-gắn) → `DeleteConfirmModal` → `useDeleteChallenge` (reason).

## Capabilities

### Modified Capabilities

- `admin-lesson-authoring`: xoá challenge ngay trong panel thực hành theo bài; xoá môn/học liệu gửi
  đúng lý do audit (sửa lỗi 400).
