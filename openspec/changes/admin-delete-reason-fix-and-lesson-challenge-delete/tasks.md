# Tasks
## 1. Sửa lỗi xoá môn / học liệu (thiếu reason)
- [x] 1.1 useDeleteSubject / useDeleteResource nhận {id, reason} + gửi body {reason}
- [x] 1.2 SubjectListPage / ResourceListPage → DeleteConfirmModal (ô lý do bắt buộc)
## 2. Xoá challenge trong panel bài
- [x] 2.1 Nút "Xoá" (danger) mỗi hàng challenge (attached + orphan) trong LessonExercisesCard
- [x] 2.2 DeleteConfirmModal + useDeleteChallenge (reason), refetch sau xoá
## 3. Verify
- [x] 3.1 npm run build xanh
- [x] 3.2 openspec validate --strict
