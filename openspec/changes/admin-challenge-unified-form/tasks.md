# Tasks — admin-challenge-unified-form

## 1. Wizard: CODE có kiểu bài NỘP
- [x] 1.1 `MetaForm` thêm `codeInputStyle` + trường bài nộp (submissionMethod/fileExtension/question/
      expectedOutput/criteria/check*); bước "Thông tin" hiện khối khi CODE + kiểu SUBMISSION
- [x] 1.2 `buildCreateChallengePayload` đính `submissionMethod` + `gradingConfig` (JSON rubric) khi
      CODE bài nộp; MCQ/CODE-testcase KHÔNG có 2 field này (pure builder + unit test)
- [x] 1.3 Bước "Nội dung" ẩn editor test case khi là bài nộp (hiện info alert, sang thẳng gắn&publish)

## 2. Edit modal: sửa cách nộp cho CODE
- [x] 2.1 `ChallengeEditModal` thêm `submissionMethod` + `fileExtension` (chỉ khi type CODE);
      `buildUpdateChallengePayload` partial-diff 2 field (pure builder + unit test)

## 3. Gỡ soạn Assignment riêng
- [x] 3.1 Xoá `LessonAssignmentEditor.tsx` + mount trong `LessonExercisesCard`
- [x] 3.2 Xoá khối API assignment + `AssignmentView`/`CreateAssignmentRequest`/`UpdateAssignmentRequest`
      + key `assignments` (giữ type `SubmissionMethod` cho DTO Challenge)

## 4. Thống nhất cổng quyền
- [x] 4.1 Bài thực hành có chấm gate theo `canManageChallenge` (wizard/edit modal), bỏ cổng riêng của
      editor bài tập cũ

## 5. Nghiệm thu
- [x] 5.1 `npm run typecheck` xanh; vitest exercises+lessons xanh (46 test)
