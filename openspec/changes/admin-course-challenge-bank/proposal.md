# admin-course-challenge-bank — Màn "Kho thử thách" per course trong academic console

## Why

BE change `course-challenge-bank` (FTES-AOS-Backend) đưa vào khái niệm **kho challenge
theo course**: mỗi course có 1 kho, challenge trong kho mặc định `COURSE_ONLY` (chỉ học
viên enrolled thấy qua lesson gắn), admin chọn lọc "public lên Workplace"
(`WORKSPACE_PUBLIC`). Admin console hiện KHÔNG có bề mặt nào quản kho này:

- `CourseDetailPage` (`src/features/academic/courses/pages/CourseDetailPage.tsx`) có 6
  tab (Tổng quan / Nội dung / Pricing / Publish / Bài học / Học thử) — chưa có tab kho
  challenge.
- Change `admin-lesson-exercise-authoring` đã spec `ChallengeWizardDrawer` (soạn
  challenge 3 bước, gắn lesson) nhưng đứng ở góc nhìn TỪNG LESSON — không có chỗ nhìn
  toàn kho của course, không có nút public/thu về.

Màn kho là nơi quản lý TẬP TRUNG: thấy toàn bộ challenge của course (kể cả DRAFT, kể cả
chưa gắn lesson), tạo/sửa qua wizard sẵn có, và điều khiển visibility.

## What Changes

- **API layer mới** `features/academic/challenge-bank/api/challengeBank.api.ts`
  (+ `.keys.ts`): `useCourseChallengeBank(courseId)` →
  `GET /api/v1/admin/challenges?courseId=`; `useSetChallengeVisibility()` →
  `POST /api/v1/admin/challenges/{id}/visibility` — qua `coreClient`, react-query pattern
  `courses.api.ts` (invalidate keys + `handleAdminMutationError`).
- **Tab mới "Kho thử thách"** trong `CourseDetailPage`: bảng list challenge của kho
  (title, type, status, visibility, lesson gắn) + filter type/visibility + nút
  "Public lên Workplace"/"Thu về kho" (confirm) + nút tạo/sửa mở `ChallengeWizardDrawer`
  của change `admin-lesson-exercise-authoring` (THAM CHIẾU CHÉO, KHÔNG duplicate — kho là
  nơi quản lý tập trung; wizard bước gắn-lesson chọn lesson trong CÙNG course).
- **Permission-driven**: tab render khi caller có `admin.challenge.manage` HOẶC
  `admin.course.manage`; action visibility chỉ enable khi có `admin.challenge.manage`
  (khớp authz BE).

## Capabilities

### New Capabilities

- `admin-course-challenge-bank`: tab Kho thử thách per course — list/filter kho, tạo/sửa
  qua ChallengeWizardDrawer dùng chung, toggle visibility có confirm.

## Impact

- Files mới: `src/features/academic/challenge-bank/{api,components}/…`; sửa
  `CourseDetailPage.tsx` (thêm tab).
- **Dependency**: BE change `course-challenge-bank` (2 endpoint admin + cột visibility)
  deploy apitest TRƯỚC; change `admin-lesson-exercise-authoring` cung cấp
  `ChallengeWizardDrawer` (nếu implement song song thì kho consume component đó — KHÔNG
  chép lại wizard).
- Không đụng route registry mới (tab nằm trong trang course detail sẵn có).
