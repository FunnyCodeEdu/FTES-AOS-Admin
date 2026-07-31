# admin-challenge-unified-form — gấp soạn Bài tập vào form Thử thách (Challenge) dạng CODE

## Why

Admin đang soạn "Bài tập (Assignment)" ở một editor RIÊNG (`LessonAssignmentEditor`) tách khỏi
"Thử thách (Challenge)", trong khi hai thứ chỉ khác nhau ở cách nhập bài làm. Kết quả là hai luồng
soạn thảo, hai khối API, hai read-model song song cho cùng một khái niệm "bài thực hành có chấm".

Phase ④ của đợt hợp nhất đã chốt: Assignment là một Thử thách `CODE` có `submissionMethod`
(GITHUB|FILE|BOTH). Vì vậy Admin nên soạn MỌI thứ qua form Thử thách, và editor bài tập tách rời
biến mất.

## What Changes

- **`ChallengeWizardDrawer`**: khi loại = `CODE`, bước "Thông tin" hiện thêm lựa chọn *kiểu nhập bài
  làm*: test case inline (chấm tự động — luồng cũ) HOẶC **bài NỘP** (gấp từ Assignment). Chọn bài nộp
  sẽ mở khối `submissionMethod` (radio GITHUB|FILE|BOTH), `fileExtension` (whitelist, hiện khi cho
  phép nộp file) và các trường rubric tự do (đề bài / kết quả mong đợi / tiêu chí) + toggle
  Logic/Hiệu năng/Edge case. Các trường này gói vào payload TẠO: `submissionMethod` (top-level) +
  `gradingConfig` (chuỗi JSON mang các key rubric). Khi là bài nộp, bước "Nội dung" KHÔNG hiện editor
  test case (tác giả chọn MỘT kiểu nhập: test case inline HOẶC rubric bài nộp). MCQ + ESSAY giữ nguyên.
- **`ChallengeEditModal`**: với thử thách `CODE`, cho sửa thêm `submissionMethod` + `fileExtension`
  (partial-diff như các field khác).
- **Gỡ soạn Assignment riêng**: xoá `LessonAssignmentEditor.tsx`, mount của nó trong
  `LessonExercisesCard`, khối API create/update/delete + `AssignmentView`/DTO tạo/sửa trong
  `exercises.api.ts`/`types.ts` (GIỮ type `SubmissionMethod` — nay dùng cho DTO Challenge). Nút "Thêm
  bài tập" biến mất; tác giả dùng "Thêm thử thách" (wizard, chọn CODE → bài nộp).
- **Thống nhất cổng quyền**: khu vực soạn bài thực hành có chấm nay chỉ gate theo `canManageChallenge`
  (wizard/edit modal) thay vì cổng `canManage` riêng của editor bài tập cũ.

## Capabilities

### Modified Capabilities

- `admin-lesson-exercises`: bài thực hành có chấm soạn hợp nhất qua form Thử thách; kiểu bài nộp
  (GitHub/File) trở thành thuộc tính của Thử thách CODE thay vì entity Assignment riêng.
