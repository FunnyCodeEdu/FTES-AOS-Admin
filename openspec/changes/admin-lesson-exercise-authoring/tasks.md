# Tasks — admin-lesson-exercise-authoring

## 1. API layer
- [x] 1.1 `features/academic/exercises/api/exercises.api.ts` + `exercises.keys.ts`: hooks quiz (list includeDrafts / create / addQuestion / deleteQuestion / publish / unpublish / archive), assignment (list / create), challenge (list / create / mcq / test-cases / rubrics / link lesson / publish) — coreClient, invalidate keys, `handleAdminMutationError`

## 2. Tab Bài tập + soạn quiz/assignment (admin-lesson-exercise-authoring)
- [x] 2.1 `LessonExercisesTab` (3 section + modal chọn loại) gắn vào `LessonEditPage.items`; gate `useCanManageCourse` + permission `challenge.manage` cho section challenge
- [x] 2.2 `QuizComposerDrawer`: meta → question editor (ràng correctKeys theo type client-side) → publish/unpublish/archive có confirm
- [x] 2.3 `AssignmentFormModal`: đủ field CreateAssignmentRequest, validate bắt buộc
- [ ] 2.4 Quality loop tính năng quiz+assignment authoring: unit test (validate correctKeys, build payload) + e2e test (seed demo: tạo quiz 3 câu → publish → learner thấy; tạo assignment → list) → đánh giá vòng 1 → fix → đánh giá vòng 2

## 3. Challenge wizard
- [x] 3.1 `ChallengeWizardDrawer` 3 bước (meta/type-content/link+publish); xử lý lỗi active-đã-tồn-tại hiển thị challenge chiếm chỗ; ghi chú AI chấm cho CODE/ESSAY (không UI chọn model)
- [ ] 3.2 Quality loop tính năng challenge authoring: unit test (wizard state, payload theo type) + e2e test (seed demo: tạo MCQ challenge trên lesson trống → publish; thử gắn lesson đã chiếm → thấy lỗi rõ) → đánh giá vòng 1 → fix → đánh giá vòng 2

## 4. Gỡ node assignment tree (admin-tree-assignment-node-removal)
- [x] 4.1 `courseTreeDraftStore` + `CourseTreeEditor`: bỏ add-assignment; badge cảnh báo + xóa node sót; comment tại `reconcileCourseTree` trỏ change này
- [ ] 4.2 Quality loop tính năng tree: unit test (draft có node assignment → không sync, không mất node khác) + e2e test (lưu tree course demo) → đánh giá vòng 1 → fix → đánh giá vòng 2

## 5. Verify chung
- [ ] 5.1 `npm run build` xanh + `tsc --noEmit` sạch; `openspec validate admin-lesson-exercise-authoring --strict` pass
