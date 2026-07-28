## Why

Trên trang quản lý bài học của khoá (`LessonListTab`), quản trị/giảng viên hiện phải:

1. Dùng **nút mũi tên Lên/Xuống** để đổi thứ tự — trùng lặp với **kéo-thả** vốn đã hoạt động (hàng bài
   học + tay cầm chương). Hai lối đổi thứ tự làm cột "Thao tác" rối.
2. **Rời khỏi bảng** sang màn soạn bài (`LessonEditPage`) mới thấy/thêm được tài liệu và thử thách của
   bài — không quản lý nhanh tại chỗ, và bảng không cho biết bài nào đã có tài liệu/thử thách.

## What Changes

- **Bỏ nút Lên/Xuống** ở cả hàng bài học lẫn card chương; kéo-thả là cách đổi thứ tự duy nhất (giữ dropdown
  "Chuyển sang chương khác" cho thao tác không-kéo). Gỡ hàm `moveWithinSiblings` + icon mũi tên không dùng.
- **Nút "+" ở mỗi bài** (cột expand đầu hàng, chỉ bài đã lưu): bấm mở/đóng một **panel quản lý ngay dưới
  bài** — tái dùng `LessonDocumentsPanel` (tải tài liệu lên · danh sách · xoá) và `LessonExercisesCard`
  (thêm/gắn thử thách · bài tập · quiz · danh sách + trạng thái). Vừa **thêm** vừa **hiển thị** tài liệu +
  thử thách ngay tại danh sách bài, không cần mở màn soạn bài.
- Panel nạp lười (chỉ hàng đang mở mới fetch), gate theo `canManage`. Không thêm hook/endpoint BE mới —
  dùng đúng các hook sẵn có.

## Capabilities

### Modified Capabilities

- `admin-lesson-authoring`: đổi thứ tự bài/chương chỉ bằng kéo-thả (bỏ nút mũi tên); quản lý tài liệu +
  thử thách của bài ngay trong danh sách bài qua panel mở bằng nút "+".
