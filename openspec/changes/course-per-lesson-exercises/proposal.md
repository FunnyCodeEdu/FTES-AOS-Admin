# course-per-lesson-exercises — soạn thực hành theo bài: thử thách + bài tập + quiz, có nộp file

## Why

Sau khi gỡ tab "Bài tập" khỏi màn soạn bài (`admin-lesson-authoring-simplify`), việc soạn thực
hành chưa có chỗ. Đồng thời "bài tập" (Assignment — chính là "exercise" của ftes cũ) chỉ nhận URL
GitHub, trong khi yêu cầu: "nộp bằng file cũng là một loại, không chỉ project/github".

## What Changes

- **`LessonExercisesCard`** trên `LessonEditPage`: liệt kê + soạn theo bài học ba loại thực hành —
  Thử thách (challenge, qua `ChallengeWizardDrawer` chế độ bài cố định), Bài tập
  (`LessonAssignmentEditor` — thêm/sửa/xoá), và Quiz (liệt kê).
- **[C3] Cách nộp bài tập** là lựa chọn hạng nhất `submissionMethod: GITHUB | FILE | BOTH`. Tác giả
  chọn phương thức cho phép; `fileExtension` là whitelist đuôi file khi cho phép nộp file. FE solver
  (lane học viên) mở tab tương ứng; BE nhận cả URL GitHub (https-only, SSRF-guarded) lẫn multipart
  file (mirror `FunnyCodeEdu-backend ExerciseController submit-and-grade`).

### Review fixes (đợt rà soát 2026-07-27)

- **Chống mất cấu hình chấm khi sửa bài tập**: `AssignmentView` (GET) KHÔNG trả lại
  `expectedOutput`/`testCases`/`checkLogic`/`checkPerform`/`checkEdgeCase`, còn
  `UpdateAssignmentRequest` (PUT) ghi đè TOÀN PHẦN → lưu sau khi sửa tiêu đề sẽ xoá các trường đó.
  Bổ sung confirm cứng liệt kê đúng những trường sắp bị ghi đè trước khi lưu (mitigation FE; fix
  gốc là BE trả đủ field / PUT partial — thuộc lane BE).
- **Đồng bộ mặc định `submissionMethod`**: BE `normalizeMethod` coi absent/null là BOTH và V270
  backfill 'BOTH'; sửa fallback `?? "GITHUB"` của Admin thành `?? "BOTH"` + cập nhật chú thích cho
  khớp thực tế BE.

## Capabilities

### New Capabilities

- `admin-lesson-exercises`: soạn thực hành theo từng bài học (challenge + assignment + quiz), bài
  tập chọn được cách nộp GitHub/File/Cả hai.
