# Tasks

## 1. API layer (theo hợp đồng V284)
- [x] 1.1 `challengeBank.api.ts`: `useCourseChallengeBank` (GET /admin/challenges?courseId=, full)
- [x] 1.2 `useChallengeCoverage` (GET /admin/challenges/coverage?courseId=)
- [x] 1.3 `useSetChallengeLesson` (PUT /admin/challenges/{id}/lesson, lessonId null = gỡ)
- [x] 1.4 `useBulkAssignChallenges` (POST /admin/challenges/lesson-assign, trả kết quả từng dòng)
- [x] 1.5 Types BankChallengeView / ChallengeCoverage / BulkAssignItem / BulkAssignResult + query keys
- [x] 1.6 VN message CHALLENGE_COURSE_MISMATCH / CHALLENGE_INVALID_PAYLOAD / ADMIN_INVALID_PARAM

## 2. Tab Kho challenge
- [x] 2.1 `CourseChallengeBankTab` — 2 cột (cây bài + list challenge), banner coverage
- [x] 2.2 Cây trái collapse + badge số challenge/bài + chọn bài = đích gán lô
- [x] 2.3 List phải: filter status + "chưa gắn", checkbox chọn nhiều
- [x] 2.4 Gán lô (2.4) + modal kết quả TỪNG DÒNG; gán-lẻ + gỡ (2.3); Publish; Public↔Workplace; Sửa nhanh
- [x] 2.5 Thêm challenge chưa gắn (ChallengeWizardDrawer chế độ Kho)
- [x] 2.6 Gắn tab vào CourseDetailPage + MyCourseDetailPage, gate quyền

## 3. Verify
- [x] 3.1 `npm run build` (tsc -b && vite build) xanh
- [x] 3.2 `openspec validate admin-course-challenge-bank-lesson-assign --strict`
