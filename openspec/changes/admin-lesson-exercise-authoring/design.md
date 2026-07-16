# Design — admin-lesson-exercise-authoring

Đã xác minh code 2026-07-16: `LessonEditPage` dùng antd `Tabs` items
(content/video/preview); `coreClient` base `${API_ROOT}/api/v1` dùng chung interceptor với
`apiClient`; `reconcileCourseTree` (courses.api.ts:263) skip node `type !== "lesson"`.

## 1. API layer mới — `features/academic/exercises/api/exercises.api.ts` (+ `exercises.keys.ts`)

Tất cả qua `coreClient` (envelope unwrap sẵn). React-query mutation + query theo pattern
`courses.api.ts` (`useMutation` + invalidate keys, `handleAdminMutationError`).

### 1.1 Quiz (endpoint course — BE sẵn có + change `course-learn-contract-gaps`)

| Hook | Endpoint |
|---|---|
| `useLessonQuizzes(lessonId)` | `GET /courses/lessons/{lessonId}/quizzes?includeDrafts=true` (BE mới — trả cả DRAFT kèm `status`, `questionCount`) |
| `useCreateQuiz(lessonId)` | `POST /courses/lessons/{lessonId}/quizzes` `{title, description, passScorePercent, timeLimitSeconds?, maxAttempts?, shuffleQuestions?}` |
| `useAddQuizQuestion(quizId)` | `POST /courses/quizzes/{quizId}/questions` `{question, type, options:[{key,text}], correctKeys, explanation?, points?, sortOrder}` |
| `useDeleteQuizQuestion()` | `DELETE /courses/questions/{questionId}` (chỉ khi quiz chưa có attempt — BE trả lỗi, UI hiện message) |
| `usePublishQuiz()` / `useUnpublishQuiz()` | `POST /courses/quizzes/{id}/publish` / `/unpublish` |
| `useArchiveQuiz()` | `DELETE /courses/quizzes/{id}` (soft) |

### 1.2 Assignment

| Hook | Endpoint |
|---|---|
| `useLessonAssignments(lessonId)` | `GET /courses/lessons/{lessonId}/assignments` (manager có FULL access nên thấy đủ) |
| `useCreateAssignment(lessonId)` | `POST /courses/lessons/{lessonId}/assignments` `{title, question, expectedOutput?, criteria?, checkLogic?, checkPerform?, checkEdgeCase?, fileExtension?, sortOrder, maxSubmissions?, free, testCases?}` |

(BE chưa có PATCH/DELETE assignment — v1 chỉ tạo + list; ghi chú spec-backlog nếu cần sửa/xóa.)

### 1.3 Challenge (`/api/v1/challenges` — permission `challenge.manage`)

| Hook | Endpoint |
|---|---|
| `useChallenges()` | `GET /challenges` — filter client-side `lessonId === lesson hiện tại` (ChallengeView có `lessonId`) |
| `useCreateChallenge()` | `POST /challenges` `{title, slug, description, type: MULTIPLE_CHOICE\|CODE\|ESSAY, mode: "INDIVIDUAL", subjectId?, startsAt, endsAt, maxSubmissions, maxTeamSize?, scoringConfig, rewardConfig, gradingConfig?}` |
| `useUpsertMcqQuestions(id)` | `PUT /challenges/{id}/mcq-questions` `{questions:[{question, options, correctKeys, points, orderNo}]}` |
| `useUpsertTestCases(id)` | `PUT /challenges/{id}/test-cases` |
| `useUpsertRubrics(id)` | `PUT /challenges/{id}/rubrics` |
| `useLinkChallengeLesson(id)` | `PUT /challenges/{id}/lesson` `{lessonId}` — 409/lỗi khi lesson đã có challenge active (uq_challenge_lesson_active) → UI hiện đích danh challenge đang chiếm chỗ |
| `usePublishChallenge(id)` | `POST /challenges/{id}/publish` |

## 2. Tab "Bài tập" — `features/academic/exercises/components/LessonExercisesTab.tsx`

- Thêm vào `LessonEditPage.items` sau tab "Học thử": `{key: "exercises", label: "Bài tập",
  children: <LessonExercisesTab lessonId={...} courseId={...} disabled={!canManage} />}`.
- Layout: 3 section (Quiz / Assignment / Challenge) mỗi section 1 antd Table nhỏ + nút thêm;
  đầu tab 1 nút "Thêm bài tập" mở `Modal` chọn loại (3 card radio: Quiz trắc nghiệm ·
  Assignment code GitHub · Challenge) → mở form tương ứng.
- **QuizComposerDrawer**: form quiz meta → sau tạo, drawer chuyển sang quản câu hỏi (list +
  form thêm câu: type select, options editor key A-D, correctKeys checkbox theo type —
  SINGLE/TRUE_FALSE đúng 1) → nút Publish (confirm). Trạng thái DRAFT/PUBLISHED hiển thị tag.
- **AssignmentFormModal**: các field §1.2; validate title/question bắt buộc, maxSubmissions ≥ 0.
- **ChallengeWizardDrawer** 3 bước:
  1. Meta: title, slug (auto từ title, editable), description, type (3 radio), startsAt/endsAt
     (mặc định now → +1 năm), maxSubmissions (mặc định 10).
  2. Nội dung theo type: MCQ editor (mirror quiz question editor) / test-cases + rubrics
     editor (CODE) / rubrics editor (ESSAY). Ghi chú inline: "CODE/ESSAY chấm bởi AI —
     cấu hình model thuộc ai-service (lane AI), admin không chọn model ở đây".
  3. Gắn & publish: `PUT /{id}/lesson` với lesson hiện tại → nếu lỗi active-đã-tồn-tại thì
     hiện challenge đang chiếm + hướng dẫn archive nó trước; xong nút Publish (confirm +
     audit BE tự ghi).
- Mọi mutation nguy hiểm (publish/unpublish/archive) có confirm dialog (nguyên tắc repo).
- Gate quyền: quiz/assignment theo `useCanManageCourse(courseId)`; section Challenge chỉ
  render khi permission `challenge.manage` trong permission set (pattern permission-driven
  sẵn có của routeRegistry/nav).

## 3. Gỡ node assignment khỏi CourseTreeEditor

- `courseTreeDraftStore` + `CourseTreeEditor`: bỏ action thêm node "assignment"; node
  assignment còn trong draft cũ render badge vàng "Bài tập đã chuyển về tab Bài tập của
  bài học" + nút xóa node (không sync). `reconcileCourseTree` giữ nguyên skip (giờ là
  đường chết có chủ đích, thêm comment trỏ change này).
- Xóa mọi type/util chỉ phục vụ node assignment nếu không còn nơi dùng (`tsc` quét).

## 4. Dependency & thứ tự

1. BE `course-learn-contract-gaps` (GET quizzes?includeDrafts) deploy trước — các phần
   assignment/challenge KHÔNG chờ (endpoint LIVE sẵn).
2. Seed `course-demo-seed-dev` cho môi trường test: lesson demo có sẵn 1 quiz/1 assignment/
   1 challenge để list không rỗng ngay lần đầu mở tab.
3. Chấm AI (ESSAY/CODE): dependency lane AI — spec này không định nghĩa contract chấm.
