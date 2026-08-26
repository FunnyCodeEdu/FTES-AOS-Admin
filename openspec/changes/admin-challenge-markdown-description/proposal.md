## Why

Ô "Mô tả" khi tạo/sửa thử thách là textarea **2 dòng** — đề bài thường dài (nhiều dòng input/output,
ví dụ) nên không đọc lại được để soát đề, và không chèn được ảnh minh hoạ.

## What Changes

- Tách `MarkdownEditor` của blog thành **component dùng chung** (`shared/components/MarkdownEditor`)
  nhận hàm `uploadImage` từ nơi dùng; blog giữ import cũ qua wrapper mỏng.
- `ChallengeDescriptionEditor`: editor markdown cho mô tả đề, upload ảnh qua
  `POST /challenges/media` (gác `challenge.manage`) — KHÔNG dùng `/blog/media` vì endpoint đó gác
  `blog.manage`, người soạn đề sẽ 403.
- Gắn vào ô Mô tả của **wizard tạo** (cao 380px) và **modal sửa** (320px). Nhãn đổi thành
  "Mô tả (markdown)" + tooltip chỉ cách chèn ảnh (nút / dán / kéo-thả).
- Mô tả lưu MARKDOWN — trang giải bài của học viên vốn đã render markdown nên định dạng + ảnh hiện
  đúng, không phải đổi gì bên learner.

## Capabilities

### Modified Capabilities

- `challenge-authoring`: soạn mô tả đề bằng markdown, xem trước, chèn ảnh.
