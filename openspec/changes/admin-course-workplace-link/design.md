# Design — admin-course-workplace-link

## Context

Web learn page hiển thị bộ công cụ môn của một khoá chỉ khi khoá được liên kết vào một môn qua một
hàng `subject.workspace_links` (`target_type = 'course.course'`, `target_id = courseId`). BE đã có
CRUD link; admin cần UI curate quan hệ 1 môn → N khoá.

## BE contract (đã đọc, KHÔNG đổi)

`WorkspaceController` (`/api/v1/subjects/{code}`):

- `GET /links?tab?` → `ApiResponse<List<LinkView>>`. Public. `tab` tuỳ chọn (`WorkspaceTab`); KHÔNG
  lọc theo `targetType` ở BE → FE tự lọc `course.course`.
- `POST /links` → `ApiResponse<LinkView>`. `authz.requireCurate(actor, subjectId)`
  (lecturer/moderator/manager trên môn). Body `CreateLinkRequest`:
  - `tab: WorkspaceTab` — **NotNull**. Dùng `LEARNING`.
  - `targetType: String` — **NotBlank, max 32**. Dùng `'course.course'`.
  - `targetId: UUID` — **NotNull**. `courseId`.
  - `titleOverride?: String (max 255)`, `sortOrder?: Integer`, `pinned?: Boolean` — bỏ trống.
- `DELETE /links/{id}` → `ApiResponse<Void>`. `requireCurate`.

`WorkspaceTab` enum: `LEARNING, RESOURCES, PRACTICE, AI, CAREER`.

`LinkView(id, tab, targetType, targetId, title, sortOrder, pinned)` — `title` = `titleOverride`
(service `view()` map thẳng `getTitleOverride()`), KHÔNG resolve tên khoá. ⇒ FE PHẢI resolve tên
khoá từ danh sách khoá admin.

Lỗi domain: `SubjectExceptionHandler` trả envelope `{code: httpStatus, message, data:{errorCode}}`.
Trùng link → `SUBJECT_LINK_DUPLICATE` (409). Link không tồn tại → `SUBJECT_LINK_NOT_FOUND` (404).
FE `normalizeError` bắt `errorCode` leaf ⇒ map bản địa hoá trong `errors.ts`.

## Decisions

1. **Đi qua `coreClient` theo subject CODE**, giống prerequisites/staff/cover. Endpoint link nằm ở
   `/api/v1/subjects/{code}/...` (KHÔNG dưới `/admin`). `SubjectDetailPage` có `subject.code` từ
   `useSubject(id)`.

2. **Resolve tên khoá qua `useCourses({page:1, pageSize:1000})`** (GraphQL `adminCourses`) — cùng
   hook dùng cho picker. Cùng `queryKey` ⇒ TanStack dedupe, chỉ 1 request phục vụ cả bảng liên kết
   lẫn picker. Khoá không có trong danh sách (đã xoá/ngoài phạm vi) → hiển thị fallback theo
   `titleOverride` hoặc `targetId` rút gọn.

3. **Lọc `targetType === 'course.course'` phía client** — GET trả mọi tab/targetType; tab này chỉ
   quan tâm link khoá. Có thể truyền `?tab=LEARNING` để thu hẹp, nhưng vẫn lọc `targetType` ở FE vì
   BE không lọc field đó.

4. **Permission gate `subject.manage` (global)** cho hành động thêm/gỡ — đồng nhất với mọi tab quản
   lý môn khác (StaffTab, OutcomesTab, SubjectInfoTab). BE gác POST/DELETE bằng `requireCurate`
   (bao gồm lecturer scoped); FE dùng gate global nhất quán màn hình, khớp đúng behavior StaffTab
   hiện có. Danh sách link vẫn XEM được kể cả khi không có quyền (GET public) — chỉ ẩn nút.

5. **Gỡ có `Modal.confirm`** (mutation nguy hiểm, theo working agreement). Thêm chặn trùng phía
   client (khoá đã liên kết) trước khi POST, giống StaffTab.

6. **`CourseSelect` component mới** khuôn `SubjectSelect`: `useCourses` pageSize 1000, `showSearch`,
   `filterOption` theo label, `options` = `{value: course.id, label: course.name}`. Tái dùng được
   cho các màn khác về sau.

## Risks / Trade-offs

- Danh sách khoá tải tối đa 1000 mục (như `SubjectSelect`/`AiExamGenerateModal` hiện có) — đủ cho
  quy mô hiện tại; nếu vượt cần server-side search sau (ngoài phạm vi).
- FE gate global `subject.manage` trong khi BE cho phép lecturer scoped — chấp nhận, khớp mẫu
  StaffTab; không rò rỉ vì BE vẫn là nguồn kiểm quyền cuối.
