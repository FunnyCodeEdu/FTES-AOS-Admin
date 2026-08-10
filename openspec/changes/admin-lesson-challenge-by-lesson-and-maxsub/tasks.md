# Tasks

## 1. Panel bài hiện đủ challenge
- [x] 1.1 `useLessonChallenges` → GET /admin/challenges/by-lesson?lessonId= (mọi status/visibility)
- [x] 1.2 Query key per-lesson (`exerciseKeys.lessonChallenges`) + mọi mutation challenge invalidate prefix rộng

## 2. Wizard CODE rõ ràng
- [x] 2.1 Nhãn "Bài nộp / Project (AI chấm)" + mô tả từng kiểu (project = không test case/vùng code)
- [x] 2.2 `codeInputStyle` bắt buộc chọn; test case editor giữ nguyên input/output

## 3. Sửa số lần nộp
- [x] 3.1 `UpdateChallengeRequest.maxSubmissions` + ChallengeEditFormValues + partial-diff
- [x] 3.2 Field InputNumber "Số lần nộp tối đa" + pre-fill từ challenge.maxSubmissions
- [ ] 3.3 CẦN BE nhận maxSubmissions trong PATCH (PR BE challenge-update-max-submissions) + deploy

## 4. Verify
- [x] 4.1 `npm run build` (tsc -b && vite build) xanh
- [x] 4.2 `openspec validate admin-lesson-challenge-by-lesson-and-maxsub --strict`
