## Why

BE V284 (đã viết & test, chưa deploy) đổi ràng buộc: một bài học nay mang NHIỀU challenge active
(trước chỉ 1 → 74/122 bài tập legacy bị ẩn). Sau deploy có thêm endpoint gán bài hàng loạt +
đối soát coverage. Admin cần một màn quản lý "Kho challenge" cấp khoá để: xem toàn bộ challenge của
khoá (mọi status), gán/gỡ vào bài (lẻ + hàng loạt), thêm challenge chưa gắn bài, và public một
challenge lên Workplace — thứ hiện chỉ làm rải rác trong từng bài.

## What Changes

- **Tab "Kho challenge"** trong chi tiết khoá (`CourseDetailPage`) + trang khoá của giảng viên
  (`MyCourseDetailPage`), gate `challenge.manage`/`course.manage` (hoặc chủ khoá). Hai cột:
  - TRÁI: cây chương/bài (`useCourse().tree`), collapse được, mỗi bài **badge số challenge** đang gắn;
    chọn 1 bài = đích cho gán hàng loạt.
  - PHẢI: **toàn bộ** challenge của khoá (`GET /admin/challenges?courseId=`, mọi status) — filter
    status + "chưa gắn bài"; **checkbox chọn nhiều → gán lô**; mỗi dòng có Select gán-lẻ + nút Gỡ,
    menu Publish / Public↔Workplace / Sửa nhanh.
- **Banner đối soát** (`GET /admin/challenges/coverage?courseId=`): còn bài tập chưa migrate /
  challenge chưa gắn → cảnh báo.
- **Thêm challenge chưa gắn bài**: `ChallengeWizardDrawer` chế độ Kho (`courseId`, cho bỏ qua gán bài).
- **Public → Workplace**: đổi `visibility` COURSE_ONLY ↔ WORKSPACE_PUBLIC (challenge public hiện ở
  mục thực hành Workplace) — chỉ khi PUBLISHED/RUNNING, có confirm.
- **Gán hàng loạt render lỗi TỪNG DÒNG** (`POST /admin/challenges/lesson-assign`): modal kết quả từng
  challenge (ok / errorCode), 1 dòng lỗi không làm hỏng cả lô.
- Hook mới: `useCourseChallengeBank`, `useChallengeCoverage`, `useSetChallengeLesson` (PUT
  `/admin/challenges/{id}/lesson`, hỗ trợ gỡ = lessonId null), `useBulkAssignChallenges`. VN message
  cho `CHALLENGE_COURSE_MISMATCH` / `CHALLENGE_INVALID_PAYLOAD` / `ADMIN_INVALID_PARAM`.

FE build theo ĐÚNG hợp đồng V284; các endpoint mới chỉ hoạt động sau khi BE deploy (trước đó tab
hiện banner/nhắc deploy, không vỡ).

## Capabilities

### Added Capabilities

- `admin-course-challenge-bank`: màn Kho challenge cấp khoá — xem/lọc, gán-lẻ & gán-lô vào bài,
  thêm challenge chưa gắn, đối soát coverage, public lên Workplace.
