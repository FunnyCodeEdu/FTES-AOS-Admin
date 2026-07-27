## Why

Mỗi môn học là một "workplace" (`/subjects/{code}`). Trang learn của web chỉ hiện bộ công cụ
môn của một khoá (Ôn tập / Hỏi đáp / workplace) khi khoá đó **đã được liên kết vào một môn**.
Liên kết đó là một hàng `subject.workspace_links` với `target_type = 'course.course'`,
`target_id = courseId`. Hiện admin CHƯA có chỗ nào quản lý các liên kết này một cách tường minh —
không thể xem, thêm, hay gỡ liên kết khoá ↔ môn. Một môn có thể có NHIỀU khoá (one subject → many
courses), nên đây là quan hệ 1–N cần admin curate.

BE đã có sẵn endpoint workspace-link (KHÔNG đổi BE trong change này):

- `GET /api/v1/subjects/{code}/links` — liệt kê link của môn (public).
- `POST /api/v1/subjects/{code}/links` — tạo link, gated `curate` (lecturer/moderator/manager trên
  môn). Body: `{ tab: WorkspaceTab, targetType: string, targetId: UUID, titleOverride?, sortOrder?,
  pinned? }`.
- `DELETE /api/v1/subjects/{code}/links/{id}` — gỡ link, gated `curate`.

`LinkView` mà BE trả CHỈ mang `title = titleOverride` (thường null cho link khoá) — KHÔNG resolve
sẵn tên khoá. FE phải tự resolve tên khoá từ danh sách khoá admin.

## What Changes

- Thêm tab **"Khóa học liên kết"** vào màn hình chi tiết môn (`SubjectDetailPage`), tái dùng khuôn
  các tab hiện có (StaffTab/OutcomesTab): server-table + picker + `<Can subject.manage>` + hook
  TanStack Query qua `coreClient` theo CODE + invalidation + `handleAdminMutationError`.
- **Xem** các link `course.course` hiện có của môn: `GET /subjects/{code}/links`, lọc client-side
  `targetType === 'course.course'`, resolve tên mỗi khoá qua danh sách khoá admin (`useCourses`).
- **Thêm** liên kết: picker khoá tìm-kiếm-được (component `CourseSelect` mới, khuôn `SubjectSelect`)
  → `POST /subjects/{code}/links` với `{ tab: 'LEARNING', targetType: 'course.course', targetId:
  courseId }`. Chặn trùng phía client (khoá đã liên kết) trước khi gọi.
- **Gỡ** liên kết: `DELETE /subjects/{code}/links/{id}` sau `Modal.confirm` (mutation nguy hiểm).
- Bản địa hoá 2 mã lỗi BE `SUBJECT_LINK_DUPLICATE` / `SUBJECT_LINK_NOT_FOUND` trong
  `shared/api/errors.ts`.
- Permission-driven: hành động thêm/gỡ gate `subject.manage` (global), đồng nhất với các tab quản lý
  môn khác. KHÔNG hardcode role. KHÔNG đụng BE.

## Capabilities

### New Capabilities

- `subject-linked-courses`: Admin xem / thêm / gỡ liên kết khoá học vào workplace của một môn
  (`target_type = 'course.course'`, `tab = 'LEARNING'`) từ tab "Khóa học liên kết" của màn chi tiết
  môn; một môn có thể liên kết nhiều khoá; gate `subject.manage`; gỡ có confirm.

## Impact

- **FE thêm/sửa**:
  - `src/features/academic/subjects/api/subjects.keys.ts` (+ key `links(code)`).
  - `src/features/academic/subjects/api/subjects.api.ts` (+ types `WorkspaceLinkView` /
    `CreateWorkspaceLinkRequest`, + hook `useSubjectLinks` / `useCreateSubjectLink` /
    `useDeleteSubjectLink` qua `coreClient` theo CODE).
  - `src/features/academic/components/CourseSelect.tsx` (mới — picker khoá tìm-kiếm-được).
  - `src/features/academic/subjects/components/LinkedCoursesTab.tsx` (mới — list + picker + unlink).
  - `src/features/academic/subjects/pages/SubjectDetailPage.tsx` (+ tab "Khóa học liên kết").
  - `src/shared/api/errors.ts` (+ map `SUBJECT_LINK_DUPLICATE` / `SUBJECT_LINK_NOT_FOUND`).
- **Không đụng BE** (repo khác). Verify `npx tsc --noEmit` + `npm run build` xanh.
