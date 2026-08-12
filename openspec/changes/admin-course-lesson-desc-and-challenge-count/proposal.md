## Why

Hai chỗ hiển thị bài học/challenge trên admin chưa rõ:
1. Tab **Kho challenge** — cây "Chương / bài học" hiển thị `name` bài, nhưng name bị TRÙNG hàng loạt
   ("[Tài liệu]", "[PREMIUM-MASTER-Thực chiến]"…) → không phân biệt được bài. `description` mới là nội
   dung thật/duy nhất.
2. Tab **Bài học** — danh sách bài KHÔNG cho biết bài nào có challenge (phải mở "+" mới thấy).

## What Changes

- `CourseChallengeBankTab`: nhãn bài học (cây + Select gán + modal kết quả) ưu tiên **description**
  (fallback name); cây kèm name làm phụ mờ để giữ ngữ cảnh thứ tự ("Buổi 1").
- `LessonListTab`: thêm cột **"Thử thách"** hiện số challenge của mỗi bài (lấy toàn kho challenge của
  khoá 1 request, gom theo lessonId) → thấy ngay bài nào có bài tập, không cần mở "+".

## Capabilities

### Modified Capabilities

- `admin-lesson-authoring`: danh sách bài hiện số challenge; kho challenge dùng mô tả bài (name trùng nhiều).
