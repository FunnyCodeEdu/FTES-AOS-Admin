## Why

Admin thiếu nút XOÁ cho khoá học và challenge dù BE đã có endpoint xoá (hard delete, gác audit
`reason`). Trước chỉ có Gỡ xuất bản/Unpublish (ẩn tạm). Người quản trị cần xoá hẳn khoá/challenge tạo
nhầm/trùng — có xác nhận + ghi lý do audit.

(Bài học/chương đã xoá được sẵn qua cây soạn bài + "Lưu thay đổi". Bảng lương chưa có endpoint xoá BE
— ngoài phạm vi, cần BE.)

## What Changes

- `DeleteConfirmModal` dùng chung (shared/components): modal xoá nguy hiểm có **ô nhập lý do bắt buộc**
  (gửi `{ reason }` vào body DELETE — BE gác `ADMIN_REASON_REQUIRED`), nút Xoá màu danger.
- **Xoá khoá học**: hook `useDeleteCourse` (DELETE /admin/courses/{id} + reason) + nút "Xoá" (danger,
  gate `course.manage`) ở `CourseTable` → `DeleteConfirmModal` ở `CourseListPage`.
- **Xoá challenge**: hook `useDeleteChallenge` (DELETE /admin/challenges/{id} + reason) + mục "Xoá"
  (danger) trong menu "…" của `CourseChallengeBankTab` → `DeleteConfirmModal`.

## Capabilities

### Modified Capabilities

- `academic-course-console`: xoá khoá học (có xác nhận + lý do audit).
- `admin-course-challenge-bank`: xoá challenge (có xác nhận + lý do audit).
