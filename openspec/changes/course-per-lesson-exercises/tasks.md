# Tasks — course-per-lesson-exercises

## 1. Card thực hành theo bài
- [x] 1.1 `LessonExercisesCard` trên `LessonEditPage`: challenge + assignment + quiz
- [x] 1.2 `LessonAssignmentEditor` thêm/sửa/xoá assignment (khớp Create/UpdateAssignmentRequest)
- [x] 1.3 `exercises.api.ts`: assignment CRUD, quiz list, challenge list per-lesson

## 2. [C3] Cách nộp bài tập
- [x] 2.1 Type `SubmissionMethod = GITHUB | FILE | BOTH`; field trên Create/Update + AssignmentView
- [x] 2.2 Radio "Cách nộp bài" + `fileExtension` là whitelist khi cho phép nộp file
- [x] 2.3 Nhãn cách nộp hiển thị trên danh sách assignment

## 3. Review fixes (2026-07-27)
- [x] 3.1 Confirm cứng trước khi lưu bài tập đang sửa: liệt kê expectedOutput/testCases/cờ chấm sẽ
      bị ghi đè (mitigation cho AssignmentView thiếu field + PUT full-overwrite)
- [x] 3.2 Fallback `submissionMethod ?? "BOTH"` (khớp BE normalizeMethod + V270) + sửa chú thích

## 4. Nghiệm thu
- [x] 4.1 `npm run build` xanh + eslint sạch (2026-07-27)
