# Design — admin-course-terms (implementation-ready)

## 1. Route & màn hình

| Path | Layout | Component | Nav |
|---|---|---|---|
| `/academic/terms` | `admin` | `TermListPage` | `{ label:"Kỳ học", icon:<CalendarOutlined/>, group:"Học thuật" }` |
| `/academic/terms/:id` | `admin` | `TermDetailPage` | — (không nav) |

- **TermListPage**: `Typography.Title "Kỳ học"` + `Card` chứa (a) hàng filter `TermFilters`
  (Input.Search theo mã/tên + Select trạng thái, đều client-side) và nút "Làm mới" + "Tạo kỳ"
  (`<Can permissions={["term.manage"]}>`); (b) `TermTable`. Skeleton khi loading, `Alert`+"Thử lại"
  khi lỗi, `Empty` khi rỗng. `TermFormModal` cho tạo/sửa.
- **TermTable**: cột Mã kỳ (`code`), Tên (`name`), Thời gian (`startsAt`–`endsAt`
  `dayjs().format("DD/MM/YYYY HH:mm")`), Trạng thái (`Tag` theo `status`), Số khoá (`courseCount`),
  Thao tác (Xem → `/academic/terms/:id`; Sửa + Xoá gate `term.manage`). Pagination client-side.
- **TermDetailPage**: header (tên + `code` code-tag + `Tag` trạng thái + nút "Sửa" gate
  `term.manage`) + `Card` mô tả nhanh (thời gian, `reminderLeadDays`, `remindedAt`, `expiredAt`) +
  `Tabs`:
  - `TermCoursesTab` — bảng `TermCourseView` (Khoá, Slug, Trạng thái khoá, Thêm lúc, Gỡ) + khối
    thêm khoá (`CourseSelect` `excludeIds` = khoá đã có + nút "Thêm khoá").
  - `TermAffectedTab` — `Statistic` tổng học viên ảnh hưởng + số khoá; bảng per-course
    (Khoá, Enrollment đang hoạt động, Purchase đang hoạt động, nút "Cấp lại học viên").

## 2. Permission gates

- Route `term.view` (cả list lẫn detail) — thiếu quyền: nav tự ẩn (`NavMenu`), route → `/403`
  (`PermissionRoute`).
- Nút ghi (Tạo/Sửa/Xoá kỳ, Thêm/Gỡ khoá, Cấp lại học viên) bọc `<Can permissions={["term.manage"]}>`
  → user chỉ có `term.view` xem được nhưng không thấy control ghi.
- BE là hàng rào thật (`term.manage` cho ghi, `term.view` cho đọc); FE gate chỉ để ẩn control.
- Không có scope CTV cho term ở đợt này (BE chỉ seed 2 leaf global).

## 3. API contract tiêu thụ (`apiClient`, base `/api/v1/admin`, envelope `{code,message,data}` tự bóc → `res.data`)

| Method | Path | Quyền | Request | Response (`data`) |
|---|---|---|---|---|
| GET | `/terms` | `term.view` | — | `TermView[]` |
| POST | `/terms` | `term.manage` | `CreateTermRequest` | `TermView` |
| GET | `/terms/{id}` | `term.view` | — | `TermView` |
| PUT | `/terms/{id}` | `term.manage` | `UpdateTermRequest` | `TermView` |
| DELETE | `/terms/{id}` | `term.manage` | — | `null` |
| GET | `/terms/{id}/courses` | `term.view` | — | `TermCourseView[]` |
| POST | `/terms/{id}/courses` | `term.manage` | `AddCourseRequest {courseId}` | `null` |
| DELETE | `/terms/{id}/courses/{courseId}` | `term.manage` | — | `null` |
| GET | `/terms/{id}/enrollments` | `term.view` | — | `TermAffectedSummaryView` |
| POST | `/courses/{courseId}/enrollments` | `term.manage` (BE `admin.course.manage`) | `{userId}` | `null` |

- Ngày là ISO-8601 Instant: gửi `dayjs.toISOString()`, hydrate `dayjs(iso)`.
- `CreateTermRequest { code(≤64,required,immutable), name(≤255,required), startsAt, endsAt, reminderLeadDays?:int (null→7) }`.
- `UpdateTermRequest { name?, startsAt?, endsAt?, reminderLeadDays? }` — KHÔNG có `code`.
- `TermView { id, code, name, startsAt, endsAt, reminderLeadDays, status, remindedAt|null, expiredAt|null, courseCount, createdAt, updatedAt }`.
- `TermCourseView { courseId, title, slugName, courseStatus, addedAt }`.
- `TermAffectedSummaryView { termId, courseCount, affectedActiveUsers, courses:{ courseId, title, activeEnrollments, activePurchases }[] }`.
- Picker khoá: `useCourses({ page:1, pageSize:1000 })` (GraphQL `adminCourses`, đã có) → `CourseSelect`.
- Re-add học viên: `useGrantCourseEnrollment(courseId)` (có sẵn `courses.api.ts`) + `useUsers` (search).

## 4. State & data (TanStack Query)

`termsKeys` (factory phân cấp, namespaced `["admin","terms"]`):
- `all`, `lists()`, `list()`, `details()`, `detail(id)`, `courses(id)`, `enrollments(id)`.

Invalidation:
- Create/Update/Delete kỳ → invalidate `lists()` (+ `detail(id)` khi update).
- Add/Remove khoá → invalidate `courses(id)` + `enrollments(id)` + `detail(id)` (đổi `courseCount`).
- Re-add học viên → không có key roster trong feature này (chỉ toast thành công); tuỳ chọn invalidate
  `enrollments(id)` để số liệu ảnh hưởng tươi lại.

## 5. Luồng nghiệp vụ chính

1. **Tạo kỳ**: nút "Tạo kỳ" → `TermFormModal` (code, name, RangePicker showTime → startsAt/endsAt,
   InputNumber reminderLeadDays default 7) → `useCreateTerm` → success toast + đóng modal + list
   refresh. Lỗi `TERM_CODE_TAKEN`/`TERM_VALIDATION`/`TERM_OVERLAP` → map tiếng Việt (Alert trong modal).
2. **Sửa kỳ**: từ bảng/detail → `TermFormModal` với `code` disabled (immutable) → `useUpdateTerm(id)`
   gửi `UpdateTermRequest` (không `code`).
3. **Thêm khoá vào kỳ**: tab "Khóa học trong kỳ" → `CourseSelect` (ẩn khoá đã có) → "Thêm khoá" →
   `useAddTermCourse(id)`; nếu BE ném `TERM_COURSE_CONFLICT` (khoá đã thuộc kỳ non-ended khác) →
   thông báo map "Khoá đã thuộc một kỳ chưa kết thúc khác." (không crash, list giữ nguyên).
4. **Cấp lại học viên**: tab "Ảnh hưởng" → nút "Cấp lại học viên" trên một khoá → `TermReAddStudentModal`
   (search học viên bằng `useUsers` debounce 300ms) → `useGrantCourseEnrollment(courseId)` → toast.

## 6. UX states

- **Loading**: `Skeleton active` (list + detail); `Table loading` khi refetch.
- **Empty**: `Empty` "Chưa có kỳ học nào" / "Chưa có khoá nào trong kỳ" / "Không có học viên ảnh hưởng".
- **Error**: `Alert type=error` + nút "Thử lại" (`refetch`).
- **Confirm-on-destructive**: Xoá kỳ và Gỡ khoá dùng `Modal.confirm` danger nêu hệ quả.
- **Trạng thái Tag**: SCHEDULED (blue "Sắp diễn ra"), ACTIVE (green "Đang diễn ra"),
  ENDED (default "Đã kết thúc").
