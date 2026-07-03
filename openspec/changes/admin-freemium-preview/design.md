# Design — admin-freemium-preview

## Context
Mentor soạn bài đọc markdown và tự quyết "học viên chưa mua thấy tới đâu". Điểm cắt teaser =
marker `<!-- ftes:preview-end -->` trong body (BE cắt server-side; không marker → BE fallback
4000 ký tự). Video preview = số giây, kế thừa course default (900) khi lesson không override.

## Goals / Non-Goals
**Goals:** editor markdown + marker UX, 2 form cấu hình preview (lesson/course), badge trạng thái.
**Non-Goals:** WYSIWYG đầy đủ, upload ảnh vào bài đọc (đợt sau), phân tích funnel preview
(thuộc admin-analytics).

## Decisions
- **Editor 2 pane**: trái textarea monospace (hoặc CodeMirror nếu đã có dep), phải preview
  render cùng renderer markdown của learner (đảm bảo WYSIWYG tương đối). Autosave draft
  local, nút Lưu gọi PUT; lỗi `LESSON_TYPE_MISMATCH` → toast + disable editor.
- **Marker là 1 dòng đặc biệt** trong preview pane: render thành divider "— Hết phần học thử —"
  để mentor thấy đúng ranh giới. Nút "Chèn điểm cắt học thử": nếu đã có marker → confirm di
  chuyển; đảm bảo tối đa 1 marker (regex strip trước khi chèn).
- **Field thời lượng học thử** (lesson VIDEO): input mm:ss, placeholder = giá trị kế thừa
  ("Mặc định khoá học: 15:00"); toggle "Tắt học thử" set 0; clear = về kế thừa (gửi null).
  Client validate ≤ duration video (từ metadata) trước khi PATCH; hiển thị lỗi BE nếu lệch.
- **Course settings**: 1 field "Học thử mặc định cho video" + helper text giải thích lesson
  override. Đổi giá trị → confirm vì ảnh hưởng mọi lesson chưa override.
- Bảng lesson trong course editor: cột badge `DOCUMENT · chưa có nội dung` (warning) khi
  `hasContent = false`; tooltip preview hiệu dụng ("Học thử 15:00 · kế thừa").

## Risks / Trade-offs
- BE chưa merge → mock API; gỡ mock khi BE sẵn (ghi tasks).
- Marker trong markdown có thể bị mentor xoá tay khi sửa text — chấp nhận, BE fallback 4000 chars.
