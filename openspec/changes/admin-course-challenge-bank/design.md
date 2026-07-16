# Design — admin-course-challenge-bank

Đã xác minh code 2026-07-16: `CourseDetailPage` dựng `Tabs items` tĩnh 6 tab; permission
check qua `useMe()` + `hasAnyPermission(new Set(me.permissions), [...])`;
`coreClient` base `${API_ROOT}/api/v1` unwrap envelope; mutation pattern react-query +
invalidate + `handleAdminMutationError` (xem `courses.api.ts`).

## 1. API layer — `features/academic/challenge-bank/api/`

### 1.1 Types (map BE `BankChallengeView` — change BE `course-challenge-bank` §3.1)

```ts
export type ChallengeVisibility = "COURSE_ONLY" | "WORKSPACE_PUBLIC";

export interface BankChallenge {
  id: string;
  title: string;
  slug: string;
  type: "MULTIPLE_CHOICE" | "CODE" | "ESSAY" | "CODING" | "SQL" | "UIUX" | "AI" | "BUSINESS";
  status: "DRAFT" | "PUBLISHED" | "RUNNING" | "CLOSED" | "ARCHIVED";
  visibility: ChallengeVisibility;
  courseId: string;
  lessonId: string | null;
  startsAt: string;
  endsAt: string;
  updatedAt: string;
}
```

### 1.2 Hooks (`challengeBank.api.ts` + `challengeBank.keys.ts`)

| Hook | Endpoint | Ghi chú |
|---|---|---|
| `useCourseChallengeBank(courseId)` | `GET /admin/challenges?courseId=` | key `["challenge-bank", courseId]`, enabled khi courseId truthy |
| `useSetChallengeVisibility(courseId)` | `POST /admin/challenges/{id}/visibility` `{visibility}` | invalidate `["challenge-bank", courseId]`; lỗi `CHALLENGE_INVALID_STATE` → message "Chỉ challenge đang hoạt động (PUBLISHED/RUNNING) mới public được" |

Tạo/sửa nội dung challenge KHÔNG có hook riêng ở đây — dùng lại API layer
`features/academic/exercises/api/exercises.api.ts` của change
`admin-lesson-exercise-authoring` (`useCreateChallenge`, `useUpsertMcqQuestions`,
`useUpsertTestCases`, `useUpsertRubrics`, `useLinkChallengeLesson`,
`usePublishChallenge`). Sau mutation từ wizard: invalidate thêm key
`["challenge-bank", courseId]` (wizard nhận callback `onMutated`).

Bổ sung nhỏ cho `useCreateChallenge`: body thêm `courseId` (BE nhận optional trên
`POST /challenges` — challenge tạo từ màn kho set thẳng vào kho course, không chờ attach).

## 2. Tab "Kho thử thách" — `features/academic/challenge-bank/components/CourseChallengeBankTab.tsx`

Thêm vào `CourseDetailPage.items` sau tab "Học thử":
`{key: "challenge-bank", label: "Kho thử thách", children: <CourseChallengeBankTab
courseId={course.id} />}` — chỉ push item khi
`hasAnyPermission(perms, ["admin.challenge.manage", "admin.course.manage"])`
(permission-driven, không hardcode role).

### 2.1 Bảng kho (antd Table)

| Cột | Nội dung |
|---|---|
| Tên | title + slug phụ (Typography secondary) |
| Loại | Tag theo type (MULTIPLE_CHOICE/CODE/ESSAY/… — màu phân biệt) |
| Trạng thái | Tag status (DRAFT xám, PUBLISHED xanh lá, RUNNING xanh dương, CLOSED/ARCHIVED đỏ nhạt) |
| Hiển thị | Tag `COURSE_ONLY` = "Trong kho" (default) / `WORKSPACE_PUBLIC` = "Public Workplace" (gold) |
| Lesson gắn | tên lesson resolve từ cây `course.sections[].lessons[]` (đã có trong `useCourse` detail — map `lessonId` → name, N/A khi chưa gắn) |
| Hành động | Sửa (mở wizard) · nút visibility (§2.3) |

- Filter đầu bảng: Select type (All + 8 type) + Select visibility (All/Trong kho/Public)
  — filter client-side trên data kho (kho 1 course đủ nhỏ).
- Empty state: "Kho chưa có thử thách" + nút tạo.

### 2.2 Tạo / sửa qua ChallengeWizardDrawer (dùng chung — KHÔNG duplicate)

- Nút "Thêm thử thách" mở `ChallengeWizardDrawer` (component của change
  `admin-lesson-exercise-authoring`, `features/academic/exercises/components/`). Kho
  truyền props mở rộng (additive, giữ tương thích chỗ gọi từ tab Bài tập của lesson):
  - `courseId` — wizard set `courseId` khi create (challenge sinh ra đã thuộc kho).
  - `lessonId?` — từ màn kho KHÔNG truyền; bước 3 (gắn & publish) đổi thành **chọn lesson
    từ cây course hiện tại** (Select cascade section→lesson, data từ `useCourse`) và cho
    phép **bỏ qua** (challenge nằm kho, chưa gắn bài — hợp lệ).
  - `onMutated` — invalidate `["challenge-bank", courseId]`.
- Sửa: mở lại wizard ở chế độ edit cho challenge DRAFT (nội dung MCQ/test-case/rubric);
  challenge đã PUBLISHED chỉ cho đổi gắn-lesson + visibility (BE là nguồn chân lý — lỗi
  BE hiện message).
- Nếu change `admin-lesson-exercise-authoring` chưa implement lúc apply: implement wizard
  TRONG change đó trước (dependency), tuyệt đối không chép wizard vào feature này.

### 2.3 Nút visibility (confirm bắt buộc — mutation ảnh hưởng public)

- `COURSE_ONLY` + status PUBLISHED/RUNNING → nút "Public lên Workplace":
  `Modal.confirm` "Thử thách sẽ hiện công khai ở Workplace practice và trang /challenges.
  Tiếp tục?" → `useSetChallengeVisibility` `{visibility: "WORKSPACE_PUBLIC"}`.
- `WORKSPACE_PUBLIC` → nút "Thu về kho": confirm "Thử thách sẽ biến mất khỏi Workplace;
  học viên đã enroll vẫn truy cập qua bài học. Thu về?" → `{visibility: "COURSE_ONLY"}`.
- Status khác (DRAFT/CLOSED/ARCHIVED) → nút public disabled + Tooltip lý do (khớp luật
  BE `CHALLENGE_INVALID_STATE`).
- Chỉ enable cụm nút khi caller có `admin.challenge.manage` (list-only cho
  `admin.course.manage` thuần — đúng authz BE).

## 3. Dependency & thứ tự

1. BE `course-challenge-bank` deploy apitest trước (GET list + POST visibility + seed
   V215 để bảng không rỗng khi test: course `seed-course-c-basic` có 4 challenge kho).
2. `admin-lesson-exercise-authoring` cung cấp `ChallengeWizardDrawer` + exercises API
   layer — implement trước hoặc cùng đợt; change này chỉ THÊM props additive cho wizard.
3. Verify click-through trên apitest bằng acc test role admin: mở tab kho → thấy 4 seed →
   public `c002` → check Workplace /challenges thấy; thu về → biến mất.
