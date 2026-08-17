## Why

Anh báo: môn tạo ra "chưa có chọn kì". Admin chưa có ô đặt "Kì" (học kỳ gợi ý trong chương trình,
FPT 1..9) cho môn — dù BE (Workspace) đã có cột recommended_semester.

## What Changes

- Type `Subject`/`SubjectFormValues`: +`recommendedSemester?: number | null`.
- `SubjectFormModal` (tạo/sửa nhanh) + `SubjectInfoTab` (tab thông tin, có full detail): thêm ô
  **"Kì"** (InputNumber 1–9, để trống = chưa xếp). InfoTab prefill từ detail; gửi kèm khi lưu.

Phần 4/4 tính năng "Kì". Cần BE (Backend#141 + Workspace + Contracts, đã merge).

## Capabilities

### Modified Capabilities

- `subject-management`: admin đặt/xem được Kì gợi ý của môn.
