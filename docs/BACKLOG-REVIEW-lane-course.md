# BACKLOG review — lane/course (admin)

Findings chất lượng (KHÔNG chặn chạy) phát hiện khi verify-first các change lane course.
Không sửa trong đợt rush; ghi lại để lấp sau.

| change | feature | finding | gợi ý |
|--------|---------|---------|-------|
| admin-course-challenge-bank | Bảng kho — action Sửa (task 3.2) | Bảng kho hiện chỉ có nút "Thêm thử thách" + action visibility; CHƯA có action "Sửa" per-row. `ChallengeWizardDrawer` là wizard create-only (luôn bắt đầu ở step 0, tạo challenge mới) — không có edit mode để nạp lại nội dung MCQ/testcase/rubric của challenge sẵn có. | Cần BE endpoint lấy challenge detail kèm content, rồi thêm `editingChallenge?` prop cho wizard: DRAFT edit đầy đủ, PUBLISHED chỉ cho gắn-lesson/đổi visibility (đúng spec Requirement "Create and edit"). |
| admin-course-challenge-bank | Quality loop test (task 1.3/2.3/3.3/4.2) | Chưa có unit test (key/enabled, invalidate sau toggle, map lỗi INVALID_STATE, ma trận enable/disable nút theo status×visibility×permission, resolve tên lesson) và chưa có e2e test apitest (GET kho seed 4 row, public c002 → hiện Workplace). | Bổ sung khi ra khỏi chế độ rush; ưu tiên ma trận enable/disable của `renderVisibilityAction` và map lỗi `CHALLENGE_INVALID_STATE`. |
| admin-course-challenge-bank | Toggle visibility — loading state (CourseChallengeBankTab.tsx) | [x] FIXED 2026-07-17: `mutatingId` (`useState<string|null>`) + helper `runVisibility` set/clear id (finally); nút `loading={mutatingId === row.id}` → chỉ row đang toggle spin. tsc+build xanh. ~~`setVisibility.isPending` state chung → mọi row cùng loading~~ | Track id đang mutate để chỉ nút của row đó loading. |
