# course-editor-slimming — gọn màn khoá học: bỏ tab thừa, gấp Publish, chuyển challenge về theo bài

## Why

Sau `admin-lesson-authoring-simplify`, màn `CourseDetailPage` vẫn còn các tab chồng chéo và một
"Kho thử thách" tách rời khỏi bài học:

- Tab "Nội dung" (`CourseTreeEditor`) trùng chức năng với tab "Bài học" (`LessonListTab`) — hai chỗ
  cùng sửa cây chương/bài, dễ lệch nhau.
- Publish là một tab riêng (`PublishTab`) dù chỉ là vài checklist + nút, nên người vận hành phải
  rời "Tổng quan" chỉ để bấm publish.
- Tab "Kho thử thách" (`CourseChallengeBankTab`) liệt kê challenge của khoá và toggle
  Public↔Workplace ở CẤP KHOÁ, trong khi việc soạn/gắn challenge lại nằm ở từng bài — hai nơi rời
  rạc cho cùng một đối tượng.

## What Changes

- **Bỏ tab "Nội dung"** và xoá `CourseTreeEditor` — cây chương/bài chỉ còn sửa ở tab "Bài học".
- **Gấp Publish vào "Tổng quan"**: `CourseInfoTab` chứa checklist + hành động publish; xoá
  `PublishTab`.
- **Gỡ tab "Kho thử thách"**, xoá module `challenge-bank` (api/keys/component/test). Toggle
  visibility Public↔Workplace và `assessPublishRisk` chuyển về `LessonExercisesCard` theo từng bài
  (`exercises/publishRisk.ts`, `useSetChallengeVisibility`).
- **Hàng bài học** thêm sửa học thử NGAY tại chỗ (`InlineTrialEditor` — giây cho VIDEO, % cho
  DOCUMENT) và "Chuyển chương" cho bài học.

### Review fixes (đợt rà soát 2026-07-27)

- `InlineTrialEditor` phân biệt ba trạng thái BE (ghi đè / kế thừa / tắt tường minh): khi bài KẾ
  THỪA học thử mặc định khoá, hiện tag "kế thừa · <effective>" + nút "Tắt hẳn" ghi 0 trực tiếp —
  không còn hiển thị sai là "Tắt" khiến người quản trị tưởng đã chặn học thử.
- Nút Lên/Xuống/"Chuyển chương" tắt cho hàng node cây type "assignment" legacy (moveNode chặn) và
  thả card báo rõ, thay vì im lặng không xảy ra gì.
- **Lưới an toàn challenge mồ côi**: sau khi gỡ "Kho thử thách", `LessonExercisesCard` liệt kê
  challenge của khoá CHƯA gắn bài (`GET /admin/challenges?courseId`, gồm DRAFT) với hành động gắn
  vào bài hiện tại / publish / đổi visibility — để challenge tạo dở (đóng wizard giữa chừng hoặc
  gắn bị 409) không biến mất khỏi admin.
- Gate hành động challenge tách khỏi gate sửa bài: `course.manage`/ownership HOẶC `challenge.manage`
  GLOBAL (khôi phục quyền của moderator chỉ có `challenge.manage`).
- Cảnh báo "khoá trả phí" khi public challenge dùng được: `LessonEditPage` truyền
  `basePrice`/`saleMode` (từ `useCourse` đã cache) xuống card.

## Capabilities

### Modified Capabilities

- `admin-course-editor`: bố cục tab khoá học rút gọn, publish nằm ở Tổng quan, challenge quản theo
  bài học (kèm lưới an toàn cho challenge chưa gắn).
