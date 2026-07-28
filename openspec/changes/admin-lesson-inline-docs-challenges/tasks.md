# Tasks

## 1. Bỏ nút Lên/Xuống (kéo-thả là chính)
- [x] 1.1 Gỡ nút mũi tên Lên/Xuống ở hàng bài học
- [x] 1.2 Gỡ nút Chương lên/Chương xuống ở card chương
- [x] 1.3 Gỡ hàm `moveWithinSiblings` + icon `ArrowUp/DownOutlined` không còn dùng; giữ kéo-thả + dropdown chuyển chương

## 2. Nút "+" mở panel tài liệu / thử thách dưới mỗi bài
- [x] 2.1 Table `expandable` với `expandIcon` là nút "+/−" (chỉ bài đã lưu), `expandedRowKeys` dùng chung
- [x] 2.2 `expandedRowRender` nhúng `LessonDocumentsPanel` + `LessonExercisesCard` (lazy, gate `canManage`)

## 3. Verify
- [x] 3.1 `npm run build` (tsc -b && vite build) xanh
- [x] 3.2 `openspec validate admin-lesson-inline-docs-challenges --strict`
