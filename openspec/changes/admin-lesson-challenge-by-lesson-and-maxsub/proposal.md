## Why

Trên tab Bài học, ba điểm gãy khi quản challenge của bài:

1. **Panel bài "không có challenge".** `useLessonChallenges` gọi `GET /challenges` (list PUBLIC/Workplace)
   rồi lọc client theo lessonId → BỎ SÓT challenge `COURSE_ONLY` (mặc định khi tạo) và DRAFT. Nên
   panel "+" của bài hiện rỗng dù challenge đã gắn.
2. **Kiểu bài CODE chưa rõ.** type=CODE mặc định "Test case" nên hiện ngay ô "Sườn code" (vùng code);
   người tạo **project (bài nộp)** thấy vùng code, tưởng sai. Nhãn "Bài nộp" chưa gợi "project".
3. **Không sửa được `số lần nộp tối đa`.** ChallengeEditModal thiếu field; BE PATCH cũng chưa nhận
   (xử ở PR BE đi kèm).

## What Changes

- `useLessonChallenges` → **`GET /admin/challenges/by-lesson?lessonId=`** (V284, mọi status + mọi
  visibility). Panel bài hiện đúng challenge của bài. Query key riêng per-lesson + mọi mutation
  challenge invalidate prefix rộng để list refresh.
- Wizard CODE: đưa lựa chọn **kiểu bài** rõ ràng — "Test case (chấm tự động)" vs **"Bài nộp / Project
  (AI chấm)"** + mô tả từng kiểu (project = KHÔNG test case, KHÔNG vùng code). (Test case editor đã có
  sẵn dòng input/output.)
- `ChallengeEditModal`: thêm field **"Số lần nộp tối đa"** (`maxSubmissions`), partial-diff như các
  field khác. Cần BE nhận `maxSubmissions` trong PATCH (PR BE `challenge-update-max-submissions`).

## Capabilities

### Modified Capabilities

- `admin-lesson-authoring`: panel bài dùng endpoint by-lesson (thấy đủ challenge); wizard CODE phân biệt
  rõ Test case vs Bài nộp/Project; sửa được số lần nộp tối đa của challenge.
