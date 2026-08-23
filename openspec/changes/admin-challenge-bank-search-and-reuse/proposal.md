## Why

Trang gắn challenge của khoá (tab Kho challenge) thiếu 3 thứ khiến việc gắn bài rất mò:
1. Ô "Bài học" chỉ hiện TÊN bài — mà tên trùng nhau hàng loạt ("[Tài liệu]", "Buổi 1"), không biết
   buổi đó dạy gì.
2. Không có ô tìm challenge — kho vài trăm bài phải cuộn tay.
3. Không lọc/nhặt được challenge theo tag từ kho chung, nên không tái dùng một challenge cho nhiều
   khoá.

## What Changes

- Option bài học hiện **2 dòng** (mô tả + tên) và ô tìm trong Select khớp CẢ tên lẫn mô tả
  (`LessonOption` + `renderLessonOption`; `WizardLessonGroup.options` thêm `name`/`desc` optional).
- Thêm **ô tìm challenge** trong kho của khoá (lọc tại chỗ theo tên / slug / loại).
- Thêm nút **"Thêm từ kho chung"** (bật khi đã chọn bài đích ở cột trái) mở `AttachFromBankModal` —
  modal sẵn có với tìm kiếm + **lọc theo tag**, gắn bằng `POST /challenges/{id}/placements` nên là
  THÊM chỗ dùng (nhiều-nhiều), KHÔNG lấy bài khỏi khoá/môn khác.

## Capabilities

### Modified Capabilities

- `academic-course-console`: gắn challenge có tìm kiếm, thấy mô tả bài, và nhặt lại được bài từ kho chung theo tag.
