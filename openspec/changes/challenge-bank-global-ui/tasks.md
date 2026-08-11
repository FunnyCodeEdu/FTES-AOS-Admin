# Tasks — challenge-bank-global-ui (PR-2)

## 1. Hooks
- [ ] 1.1 `useChallengeBankSearch(params)` → `GET /admin/challenges/bank` (q, tags, type, difficulty,
      subjectId, courseId, status, free, onlyUnattached, page, size) — keepPreviousData cho phân trang
- [ ] 1.2 `useChallengeTags(q)` + `useSetChallengeTags(challengeId)` (`PUT /admin/challenges/{id}/tags`)
- [ ] 1.3 `useAddChallengePlacement` / `useRemoveChallengePlacement`
      (`POST|DELETE /admin/challenges/{id}/placements`)
- [ ] 1.4 `useCourseChallengeTags(courseId)` → `GET /admin/courses/{id}/challenge-tags`
- [ ] 1.5 Bổ sung key vào `challengeBankKeys` (giữ pattern factory sẵn có)

## 2. Tab Kho challenge
- [ ] 2.1 Công tắc "Chỉ khoá này | Tất cả các môn" (mặc định: chỉ khoá này) — đổi nguồn sang
      `useChallengeBankSearch`, bỏ lọc client-side `useMemo`, chuyển phân trang sang server
- [ ] 2.2 `ChallengeBankFilters`: ô tìm tiêu đề (debounce), select tag (multi) / độ khó / loại /
      trạng thái / "chỉ chưa gắn"
- [ ] 2.3 Cột **"Đang dùng ở N bài"** + popover liệt kê nơi dùng; "Gán vào bài đang chọn" gọi
      add-placement; "Gỡ khỏi bài" gọi remove-placement (đổi nhãn/confirm cho đúng nghĩa gỡ 1 nơi)
- [ ] 2.4 Cây "Chương / bài học": hiện `description` dưới tiêu đề bài (mirror `LessonListTab`,
      `Typography.Text type="secondary"` 12px) — dữ liệu đã có sẵn trong `CourseTreeNode`

## 3. Tag
- [ ] 3.1 `ChallengeTagPicker` (Select mode="tags", autocomplete từ `useChallengeTags`) trong
      `ChallengeEditModal` và/hoặc action hàng ở kho
- [ ] 3.2 `CourseInfoTab`: Card "Tag challenge của khoá" (đặt sau `</Form>`, trước `CoursePublishCard`)
      — bấm tag → mở kho đã lọc sẵn tag đó

## 4. Verify
- [ ] 4.1 Unit (vitest) cho hàm thuần build query params của bank search
- [ ] 4.2 `npm run build` + `npx tsc --noEmit` xanh
