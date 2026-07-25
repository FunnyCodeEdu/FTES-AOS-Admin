## Context

Course list (`CourseListPage` + `CourseTable`) chạy thật qua GraphQL `adminCourses` (trả course `id`). Backend vừa có `POST /api/v1/admin/courses/{id}/enrollments {userId}` (permission `admin.course.manage`). User picker có sẵn: `useUsers({search,page,pageSize})` (GraphQL `adminUsers`, trả `{id,username,email,fullName}`). Client admin (`apiClient`) base `/api/v1/admin`, đã unwrap envelope + refresh token.

## Goals / Non-Goals

**Goals:**
- Cấp quyền học viên vào course chạy thật, end-to-end, verify được (list + endpoint đã có).
- Theo pattern nhà (react-query mutation, antd Modal/Form/Select, `Can` gate, `handleAdminMutationError`).

**Non-Goals:**
- Re-point course-detail/tree + nối lesson content — chặn bởi BE (không có admin course-detail-by-id read). Tách change sau kèm mẩu BE.
- Thu hồi enrollment (chưa có endpoint BE).
- Upload video (storage BE stub).

## Decisions

**D1 — Đặt action ở CourseList (không phải CourseDetail).** Course detail hiện KHÔNG load được (admin gọi `GET /admin/courses/:id` không tồn tại; GraphQL không có `adminCourse` detail). Course LIST thì chạy thật. Nên gắn "Cấp học viên" vào hàng của bảng list — nơi có `course.id` thật. *Thay vì* thêm tab trong CourseDetailPage (đang hỏng).

**D2 — Picker học viên bằng `useUsers` search, gửi `userId`.** BE nhận `userId` (UUID). Select `showSearch` + debounce nhẹ (300ms) → `useUsers({search})` → options `{label: username·email, value: id}`. *Thay vì* nhập userId thô (khó dùng).

**D3 — Gate UI bằng `course.update`.** Nút hiện theo permission FE `course.update` (đã dùng cho Sửa); BE vẫn enforce `admin.course.manage` (nguồn thật). Chấp nhận lệch nhẹ (thấy nút nhưng có thể 403) — BE là chốt chặn. *Thay vì* hardcode role.

**D4 — Hook qua `apiClient` (base `/api/v1/admin`), path `/courses/{id}/enrollments`.** Endpoint grant nằm dưới `/admin` nên KHÔNG cần client creator mới; onError dùng `handleAdminMutationError` như các mutation nguy hiểm khác.

## Risks / Trade-offs

- **Lệch permission FE/BE** → Mitigation: BE enforce; có thể siết gate FE = `admin.course.manage` nếu catalog FE có.
- **userId không tồn tại** → BE nhận UUID từ picker (user thật) nên hiếm; BE không validate sâu (đã ghi giả định ở change BE).
- **Không runtime-verify tới PAID/grant thật** (auth-gated) → verify tsc + build + render modal; grant thật cần login admin + BE chạy.

## Migration Plan

FE-only, không migration. Verify `npm run build` + `tsc --noEmit`. Rollback = gỡ action + modal + hook.
