## Context

BE giờ có `adminCourse(id)` (GraphQL, cây kèm id) + creator REST `/api/v1/courses/*` (sections/lessons) + `/api/v1/lessons/{id}/content`. Admin `apiClient` base `/api/v1/admin` (không gọi được các path trên). `CourseTreeNode` đã có field `id?` + `key`. `graphqlRequest<T>(query, vars)` sẵn có.

## Goals / Non-Goals

**Goals:** Tree load + save thật; lesson content thật. Theo pattern nhà (react-query, graphqlRequest, axios client, antd). Build xanh.

**Non-Goals:** assignment persist (BE không có); pricing/publish/preview (đợt sau); upload video (storage stub). Không runtime-verify tới lưu thật (auth-gated).

## Decisions

**D1 — `coreClient` base `/api/v1`, dùng chung interceptor với `apiClient`.** Refactor phần attach interceptor thành `installInterceptors(client)` (token + unwrap envelope + refresh-401 retry theo đúng client) rồi áp cho cả `apiClient` lẫn `coreClient`. *Thay vì* nhét path tuyệt đối lung tung hoặc duplicate interceptor.

**D2 — `useCourse` dùng `adminCourse(id)` GraphQL, map ra `CourseDetail`.** Node dùng `id` làm `key` cho node đã tồn tại (giữ ổn định); status BE UPPERCASE → CourseStatus lowercase; packages/publishChecklist = [] (tab khác). null → throw để trang hiện error.

**D3 — Save = reconcile tuần tự, sortOrder theo index.** Duyệt draft: section có `id` → PATCH (name/description/sortOrder=index); không id → POST (nhận id) rồi tạo lessons con. Lesson tương tự (POST `/sections/{sid}/lessons`, PATCH `/lessons/{lid}`). Thu thập id còn sống → DELETE mọi section/lesson id ở server-tree không còn trong draft. **Không gọi reorder riêng** (sortOrder set inline mỗi item). Node "assignment" bỏ qua (BE không có tầng này). Xong `invalidateQueries(detail)` để lấy id thật. Sequential (không parallel) để lấy section id trước khi tạo lesson con + tránh đè thứ tự.

**D4 — Lesson content thật qua `coreClient`.** `GET /lessons/{id}/content` → `{lessonId, bodyMd, readingMinutes, ...}` map sang `LessonContent`; `PUT /lessons/{id}/content` body `{bodyMd, readingMinutes}`. Preview/course-preview-default giữ mock (đợt sau).

## Risks / Trade-offs

- **Reconcile phức tạp, không runtime-verify được** → Mitigation: logic tuần tự rõ ràng, build+tsc xanh; test tay khi có admin login + BE. Save lỗi giữa chừng → phần đã ghi vẫn ở BE (không transaction) → refetch cho thấy trạng thái thật; hiển thị lỗi.
- **Xoá section xoá cascade lesson ở BE** → chỉ cần DELETE section (không cần DELETE từng lesson con của section đã xoá). Reconcile: nếu section bị xoá thì bỏ qua lessons con của nó khi tính delete.
- **Status map thiếu giá trị lạ** → default "draft".

## Migration Plan

FE-only. Verify `npm run build` + `tsc`. Rollback = revert 4 file.
