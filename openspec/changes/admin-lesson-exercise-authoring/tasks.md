# Tasks — admin-lesson-exercise-authoring

## 1. API layer
- [x] 1.1 `features/academic/exercises/api/exercises.api.ts` + `exercises.keys.ts`: hooks quiz (list includeDrafts / create / addQuestion / deleteQuestion / publish / unpublish / archive), assignment (list / create), challenge (list / create / mcq / test-cases / rubrics / link lesson / publish) — coreClient, invalidate keys, `handleAdminMutationError`

## 2. Tab Bài tập + soạn quiz/assignment (admin-lesson-exercise-authoring)
- [x] 2.1 `LessonExercisesTab` (3 section + modal chọn loại) gắn vào `LessonEditPage.items`; gate `useCanManageCourse` + permission `challenge.manage` cho section challenge
- [x] 2.2 `QuizComposerDrawer`: meta → question editor (ràng correctKeys theo type client-side) → publish/unpublish/archive có confirm
- [x] 2.3 `AssignmentFormModal`: đủ field CreateAssignmentRequest, validate bắt buộc
- [x] 2.4 Quality loop tính năng quiz+assignment authoring: unit test ĐÃ CÓ 2026-07-22 — `types.test.ts` (validateCorrectKeys SINGLE/TRUE_FALSE đúng-1, MULTIPLE ≥1), `components/QuizComposerDrawer.test.ts` (tách pure `buildCreateQuestionBody`: key A..F theo vị trí + overflow "7", correctKeys từ ô tick, chặn error TRƯỚC request, explanation rỗng→undefined, points default 1, sortOrder nối cuối), `components/AssignmentFormModal.test.ts` (tách pure `buildCreateAssignmentBody`: text rỗng→undefined, maxSubmissions 0 giữ 0, cờ AI chấm pass-through). CÒN LẠI: e2e seed demo (tạo quiz 3 câu → publish → learner thấy; tạo assignment → list) — cần môi trường apitest

## 3. Challenge wizard
- [x] 3.1 `ChallengeWizardDrawer` 3 bước (meta/type-content/link+publish); xử lý lỗi active-đã-tồn-tại hiển thị challenge chiếm chỗ; ghi chú AI chấm cho CODE/ESSAY (không UI chọn model)
- [x] 3.2 Quality loop tính năng challenge authoring: unit test ĐÃ CÓ 2026-07-22 — `components/ChallengeWizardDrawer.test.ts` (tách pure: slugify bỏ dấu+đ→d+cap 60; `buildCreateChallengePayload` mode INDIVIDUAL, slug fallback, courseId CHỈ khi mode Kho; `buildMcqQuestionItems` key/orderNo/points default + error khi câu 0 đáp-đúng CHẶN trước request; `buildTestCaseItems` default 2000ms/256MB/weight 1; `buildRubricItems` default ''/10; wizard state: `isPublishBlocked` lesson-mode phải link, bankMode publish ngay; `isLessonLinkConflict` errorCode CHALLENGE_LESSON_ALREADY_ATTACHED | 409). CÒN LẠI: e2e seed demo (MCQ trên lesson trống → publish; gắn lesson đã chiếm → thấy lỗi rõ) — cần môi trường apitest

## 4. Gỡ node assignment tree (admin-tree-assignment-node-removal)
- [x] 4.1 `courseTreeDraftStore` + `CourseTreeEditor`: bỏ add-assignment; badge cảnh báo + xóa node sót; comment tại `reconcileCourseTree` trỏ change này
- [x] 4.2 Quality loop tính năng tree: unit test ĐÃ CÓ 2026-07-22 — `courses/api/reconcileCourseTree.test.ts` (mock coreClient: node assignment KHÔNG sinh request nào, sortOrder lesson không bị chen lỗ, node khác PATCH/POST/DELETE đủ + section mới POST trước rồi lesson theo id BE trả) + `courses/store/courseTreeDraftStore.test.ts` (assignment sót GIỮ trong draft để user thấy cảnh báo, removeNode gỡ đúng 1 node, addNode chặn lesson top-level/vào lesson, moveNode sai tầng CHẶN giữ nguyên tree, move hợp lệ không mất node). CÒN LẠI: e2e lưu tree course demo — cần môi trường apitest

## 5. Verify chung
- [ ] 5.1 `npm run build` xanh + `tsc --noEmit` sạch; `openspec validate admin-lesson-exercise-authoring --strict` pass

## Nghiệm thu E2E 2026-07-23
- BLOCKED-ADMIN-CREDS: kịch bản cần đăng nhập ADMIN vào CMS; mật khẩu admin.test đã xoay 2026-07-21 (/root/.ftes-test-credentials trên box apitest), máy local không SSH tới box. Điều kiện mở khoá: cấp lại mật khẩu admin.test hoặc chạy trên server.
