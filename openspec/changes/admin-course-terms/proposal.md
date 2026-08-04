# admin-course-terms — Quản lý Kỳ học (term) trong Admin

## Why

Nghiệp vụ: một **kỳ học** (term/semester) có thời điểm bắt đầu/kết thúc và một số ngày nhắc trước
(`reminderLeadDays`), CHỨA một tập khoá học. Khi kỳ kết thúc, backend tự động "đá" (huỷ enrollment)
học viên khỏi các khoá thuộc kỳ. Admin mảng Học thuật (`admin-academic`, xem
`docs/ADMIN-ARCHITECTURE.md` §1) cần một mặt quản trị để: CRUD kỳ, thêm/gỡ khoá vào kỳ, xem học viên
bị ảnh hưởng, và cấp lại (re-enroll) một học viên vào một khoá.

Backend đã dựng sẵn domain `term` (PR riêng): endpoint `/api/v1/admin/terms**`, gác BE bằng
`term.view` (đọc) và `term.manage` (ghi). Admin v2 CHƯA có UI nào tiêu thụ — thiếu nav/route/console.

## What Changes

- **Feature folder mới** `src/features/academic/terms/{api,components,pages}` theo đúng khuôn feature
  `subjects` (query-key factory phân cấp namespaced `["admin","terms"]`, hooks qua `apiClient`,
  mutation `onError: handleAdminMutationError` + `invalidateQueries`).
- **`TermListPage`** (`/academic/terms`): bảng kỳ (mã, tên, thời gian, trạng thái
  SCHEDULED/ACTIVE/ENDED, số khoá) + nút **"Tạo kỳ"** (gate `term.manage`) mở `TermFormModal`
  (tạo/sửa; `code` khoá cứng khi sửa vì immutable). Search + lọc trạng thái client-side, đủ
  loading/empty/error state.
- **`TermDetailPage`** (`/academic/terms/:id`): thông tin kỳ + tabs:
  - **"Khóa học trong kỳ"** — liệt kê `TermCourseView[]`, thêm khoá qua picker khoá tìm kiếm
    (`CourseSelect`) → `POST /courses` với UX chống trùng + map lỗi `TERM_COURSE_CONFLICT`,
    gỡ khoá có confirm.
  - **"Ảnh hưởng"** — render `TermAffectedSummaryView`: tổng học viên ảnh hưởng + số khoá +
    per-course enrollment/purchase đang hoạt động; mỗi khoá có nút **"Cấp lại học viên"** (re-add)
    mở modal cấp học viên bằng hook có sẵn `useGrantCourseEnrollment`.
- **`CourseSelect`** mới (`src/features/academic/components/CourseSelect.tsx`) — picker khoá học
  dùng lại `useCourses`, mirror `SubjectSelect`, hỗ trợ `excludeIds` để ẩn khoá đã thêm.
- **Route + nav + gate**: 2 entry trong `routeRegistry.tsx` — list `/academic/terms`
  (`nav: { label:"Kỳ học", group:"Học thuật" }`, `requiredPermissions:["term.view"]`) và detail
  `/academic/terms/:id` (no nav). Nút ghi gate `<Can permissions={["term.manage"]}>`.
- **Bản địa hoá lỗi**: thêm `TERM_NOT_FOUND`, `TERM_CODE_TAKEN`, `TERM_VALIDATION`,
  `TERM_COURSE_CONFLICT`, `TERM_OVERLAP` vào `ADMIN_ERROR_MESSAGES`.
- **Types**: thêm block `// ---------- Terms ----------` vào
  `src/features/academic/types/index.ts`.

## Capabilities

### New Capabilities
- `admin-course-terms`: admin quản lý kỳ học — CRUD kỳ (mã immutable), quản khoá trong kỳ (thêm/gỡ),
  xem học viên bị ảnh hưởng khi kỳ kết thúc, và cấp lại học viên vào một khoá; đọc gate `term.view`,
  ghi gate `term.manage`.

### Modified Capabilities
<!-- Không sửa capability sẵn có. -->

## Impact

- FE files mới: `src/features/academic/terms/api/terms.keys.ts`,
  `src/features/academic/terms/api/terms.api.ts`,
  `src/features/academic/terms/components/{TermFormModal,TermTable,TermCoursesTab,TermAffectedTab,TermReAddStudentModal}.tsx`,
  `src/features/academic/terms/pages/{TermListPage,TermDetailPage}.tsx`,
  `src/features/academic/components/CourseSelect.tsx`.
- FE files sửa: `src/features/academic/types/index.ts` (+block Terms),
  `src/app/routeRegistry.tsx` (+2 route/nav), `src/shared/api/errors.ts` (+5 mã TERM_*).
- API BE tiêu thụ (`apiClient`, base `/api/v1/admin`): `GET/POST /terms`, `GET/PUT/DELETE /terms/{id}`,
  `GET/POST /terms/{id}/courses`, `DELETE /terms/{id}/courses/{courseId}`, `GET /terms/{id}/enrollments`.
  Re-add học viên dùng lại `POST /api/v1/admin/courses/{courseId}/enrollments {userId}`
  (`useGrantCourseEnrollment` có sẵn).
- Permission leaf: `term.view` (route/đọc), `term.manage` (nút/ghi) — BE chỉ seed 2 leaf này.
- KHÔNG đổi BE. Auto-kick khi kỳ kết thúc là việc của BE; FE chỉ dựng mặt quản trị.
