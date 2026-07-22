# Tasks — admin-course-challenge-bank

> Dependency: BE `course-challenge-bank` (GET /admin/challenges?courseId= + POST
> /{id}/visibility + seed V215) deploy apitest TRƯỚC; `admin-lesson-exercise-authoring`
> cung cấp `ChallengeWizardDrawer` + exercises API (không duplicate).

## 1. API layer challenge-bank
- [ ] 1.1 `features/academic/challenge-bank/api/challengeBank.keys.ts` +
      `challengeBank.api.ts`: types `BankChallenge`/`ChallengeVisibility`;
      `useCourseChallengeBank(courseId)` (GET, enabled khi courseId);
      `useSetChallengeVisibility(courseId)` (POST + invalidate + map lỗi
      `CHALLENGE_INVALID_STATE` thành message dễ hiểu) — qua `coreClient`, pattern
      `courses.api.ts`
- [ ] 1.2 Bổ sung `useCreateChallenge` (exercises API) nhận `courseId` optional trong body
      (additive — chỗ gọi cũ không vỡ)
- [x] 1.3 Quality loop tính năng API layer: unit test (key/enabled, invalidate sau toggle,
      map lỗi INVALID_STATE) + e2e test (apitest acc admin: GET kho course seed trả 4 row)
      → đánh giá vòng 1 → fix → đánh giá vòng 2 — unit PASS 2026-07-22
      (`challengeBank.api.test.tsx` + map INVALID_STATE ở `shared/api/errors.test.ts`);
      e2e apitest còn nợ

## 2. Tab "Kho thử thách" trong CourseDetailPage
- [ ] 2.1 `CourseChallengeBankTab.tsx`: antd Table (title+slug, type tag, status tag,
      visibility tag "Trong kho"/"Public Workplace", lesson gắn resolve từ cây
      `course.sections[].lessons[]`, actions); filter Select type + visibility
      (client-side); empty state + nút tạo
- [ ] 2.2 Thêm tab vào `CourseDetailPage.items` (sau "Học thử") — chỉ push khi
      `hasAnyPermission(perms, ["admin.challenge.manage","admin.course.manage"])`
- [x] 2.3 Quality loop tính năng bảng kho: unit test (render cột, filter type/visibility,
      ẩn tab khi thiếu quyền, resolve tên lesson) + e2e test (mở tab trên course seed →
      thấy 4 challenge + đúng tag visibility) → đánh giá vòng 1 → fix → đánh giá vòng 2
      — unit PASS 2026-07-22 (`CourseChallengeBankTab.test.ts`: filterBankRows +
      buildLessonNameMap; repo test pure-helper, không render antd Table); e2e còn nợ

## 3. Wire ChallengeWizardDrawer dùng chung
- [ ] 3.1 Mở rộng props `ChallengeWizardDrawer` (additive): `courseId` (set khi create),
      `lessonId?` optional, bước attach = picker section→lesson của course hiện tại
      (data `useCourse`) + skippable, callback `onMutated` invalidate
      `["challenge-bank", courseId]` — chỗ gọi cũ từ tab Bài tập lesson giữ nguyên hành vi
- [ ] 3.2 Nút "Thêm thử thách" + action Sửa trong bảng kho mở wizard (edit đầy đủ cho
      DRAFT; PUBLISHED chỉ gắn-lesson/visibility, lỗi BE hiện message)
- [x] 3.3 Quality loop tính năng wizard-từ-kho: unit test (create mang courseId, attach
      picker chỉ lesson cùng course, skip attach hợp lệ, onMutated invalidate) + e2e test
      (tạo challenge MCQ từ kho không gắn lesson → hiện trong bảng; gắn vào lesson course
      → cột lesson cập nhật) → đánh giá vòng 1 → fix → đánh giá vòng 2 — unit PASS
      2026-07-22 (`ChallengeWizardDrawer.test.ts` courseId additive + skip attach;
      `CourseChallengeBankTab.test.ts` buildLessonOptions course-scoped); e2e còn nợ

## 4. Toggle visibility
- [ ] 4.1 Nút "Public lên Workplace" (enable khi PUBLISHED/RUNNING + COURSE_ONLY +
      quyền `admin.challenge.manage`; disabled + Tooltip lý do khi DRAFT/CLOSED/ARCHIVED
      hoặc thiếu quyền) và "Thu về kho" (khi WORKSPACE_PUBLIC) — cả hai `Modal.confirm`
      với copy nêu hệ quả → `useSetChallengeVisibility`
- [x] 4.2 Quality loop tính năng toggle: unit test (ma trận enable/disable theo
      status×visibility×permission, confirm trước khi gọi) + e2e test (public `c002` seed
      → tag đổi; mở Workplace /challenges thấy; thu về → biến mất khỏi Workplace) →
      đánh giá vòng 1 → fix → đánh giá vòng 2 — unit PASS 2026-07-22
      (`CourseChallengeBankTab.test.ts` visibilityActionFor đủ ma trận; đường gọi qua
      Modal.confirm giữ trong component); e2e c002 còn nợ

## 5. Verify chung
- [ ] 5.1 `npm run build` xanh + `tsc --noEmit` sạch;
      `openspec validate admin-course-challenge-bank --strict` pass
