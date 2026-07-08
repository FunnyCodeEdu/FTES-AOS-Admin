## Why

Sau khi BE có `adminCourse(id)` (trả cây section/lesson kèm id) và các endpoint creator `/api/v1/courses/*`, giờ nối được **thêm part/lesson + soạn nội dung lesson** chạy thật. Hiện Admin: course-detail gọi `GET /admin/courses/:id` (không tồn tại) → không load; tree save gọi `PUT /courses/:id/tree` (không tồn tại); lesson content còn mock.

## What Changes

- **`coreClient`** (mới, base `/api/v1`): axios client cho endpoint creator/lesson (ngoài `/admin`), dùng chung interceptor (token + unwrap envelope + refresh 401) với `apiClient`.
- **`useCourse(id)`** → đổi sang GraphQL `adminCourse(id)`, map ra `CourseDetail` với `tree` mang **id thật** của section/lesson.
- **Tree save (`CourseTreeEditor`)** → thay `PUT /courses/:id/tree` bằng **reconcile granular** qua creator endpoints: tạo/sửa/xoá section (`POST/PATCH/DELETE /courses/{id}/sections|/sections/{sid}`) + lesson (`POST/PATCH/DELETE /sections/{sid}/lessons|/lessons/{lid}`), sortOrder = vị trí; xong invalidate detail để lấy id mới.
- **Lesson content** (`lessons.api.ts`) → bỏ mock, gọi thật `GET/PUT /api/v1/lessons/{id}/content` qua `coreClient`.

## Capabilities

### New Capabilities

- `admin-course-tree-wiring`: Admin load được cây curriculum theo course id, và Lưu nội dung sẽ đồng bộ thay đổi cây (section/lesson) xuống BE qua các endpoint granular.
- `admin-lesson-content-wiring`: Soạn/nạp nội dung markdown của lesson chạy thật qua endpoint BE.

## Impact

- **FE sửa**: `shared/api/client.ts` (coreClient + refactor interceptor), `courses/api/courses.api.ts` (useCourse GraphQL + save reconcile), `courses/components/CourseTreeEditor.tsx` (save), `lessons/api/lessons.api.ts` (content thật).
- **BE**: dùng `adminCourse(id)` + creator `/api/v1/courses/*` + `/api/v1/lessons/*` (đã có), không đổi.
- **Ngoài scope**: node "assignment" của tree (BE model chỉ section→lesson, không persist assignment → drop khi save, ghi rõ); pricing/publish tab (endpoint khác chưa có); upload video (storage BE stub); lesson preview/course-preview-default (vẫn mock — endpoint có nhưng để đợt sau).
