# Tasks — admin-freemium-preview

## 1. Document editor
- [ ] 1.1 Hook `useLessonContent` (GET/PUT /api/v1/lessons/{id}/content; mock khi BE chưa merge — gỡ khi BE sẵn)
- [ ] 1.2 Editor 2 pane (source markdown + preview render dùng chung renderer với learner); autosave draft local, nút Lưu, toast lỗi `LESSON_TYPE_MISMATCH`
- [ ] 1.3 Nút "Chèn điểm cắt học thử": strip marker cũ (confirm di chuyển) + chèn `<!-- ftes:preview-end -->` tại con trỏ; preview pane render marker = divider "— Hết phần học thử —"

## 2. Preview config
- [ ] 2.1 Field mm:ss per-lesson VIDEO (placeholder giá trị kế thừa, toggle tắt = 0, clear = null) → PATCH /lessons/{id}/preview; validate ≤ duration video READY
- [ ] 2.2 Course settings: field "Học thử mặc định cho video" (+confirm) → PATCH /courses/{id}/preview-default

## 3. Bảng lesson & quyền
- [ ] 3.1 Badge "chưa có nội dung" (DOCUMENT, hasContent=false) + tooltip preview hiệu dụng (kế thừa/override)
- [ ] 3.2 Gate UI theo `course.manage` ownership-scoped (mentor sở hữu / Admin mảng học thuật)

## 4. Verify
- [ ] 4.1 i18n vi/en cho editor + config; tsc/eslint/build xanh; `openspec validate admin-freemium-preview` PASS
