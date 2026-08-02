## Why

Một thử thách (challenge) trong kho-khoá gắn vào bài học chỉ mở cho học viên ĐÃ ĐĂNG NHẬP nhưng CHƯA
enroll khi thoả CẢ HAI điều kiện: bài học `free=true` (lesson FULL-access) **VÀ** thử thách đó
`free=true` ("học thử"). Nếu bài học là Premium thì dù thử thách đánh dấu `free`, học viên vẫn bị chặn
sau enroll — đúng lỗi chủ khoá gặp.

Trên Admin, tác giả HIỆN chỉ đổi được cờ `free` của thử thách qua modal "Sửa" (nhiều bước) và KHÔNG có
chỗ nào bật cờ `free` của BÀI HỌC ngay tại nơi quản thử thách. Vì phải bật đúng CẢ HAI cờ, tác giả cần
một chỗ trực quan để bật/tắt nhanh cả hai và nhìn rõ trạng thái.

## What Changes

- **Toggle "Học thử" per-thử-thách** ngay trên mỗi hàng thử thách ĐÃ GẮN bài trong `LessonExercisesCard`
  (nguồn `challenges.data` có `free` thật) — `Switch` + tooltip, gọi `useUpdateChallenge({ free })`,
  spinner theo hàng, `message.success`, tự invalidate danh sách. KHÔNG gắn cho danh sách "chưa gắn"
  (thiếu `free` tin cậy). Người CHỈ ĐỌC vẫn thấy tag "Miễn phí" như cũ.
- **Toggle "Miễn phí (học thử)" per-BÀI-HỌC** ở đầu `LessonExercisesCard` — `Switch` + tooltip, gọi
  `useUpdateLessonMeta({ free })` (PATCH `/courses/lessons/{id}`), optimistic + revert khi lỗi, gate
  theo `canManage`. Cờ `free` của bài được thread từ cây khoá (`LessonListTab`) và `adminLessonContent`
  (`LessonEditPage`).
- Thread `free` của bài qua `CourseTreeNode` (BE đã trả sẵn field `free` ở `adminCourse` GraphQL, chỉ
  cần map xuống node) → `LessonRow` → prop `lessonFree` của card.
- KHÔNG thêm endpoint/hook BE mới — dùng đúng `useUpdateChallenge` và `useUpdateLessonMeta` sẵn có.

## Capabilities

### Modified Capabilities

- `admin-lesson-authoring`: bật/tắt nhanh cờ `free` của BÀI HỌC và của từng THỬ THÁCH ngay trong panel
  thực hành của bài, để mở "học thử" cho học viên đăng nhập chưa enroll (cần bật CẢ HAI cờ).
