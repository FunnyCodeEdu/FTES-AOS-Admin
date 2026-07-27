# admin-subject-course-links — Liên kết khoá học vào môn (workplace) trong Admin

## Why

Nghiệp vụ (chủ sản phẩm, nguyên văn): "Một môn thì có thể có nhiều khóa học vì vậy nên trong
admin có phần chọn workplace để liên kết ở admin." Một MÔN có thể gắn NHIỀU KHOÁ HỌC, nên admin
cần chỗ để chọn khoá học liên kết vào workplace của môn.

Liên kết này là nguồn để trang Learn suy ra `subjectCode` của một khoá — nó phân giải qua
`subject.workspace_links` với `target_type='course.course'`. BE đã có sẵn `WorkspaceController`
(`/api/v1/subjects/{code}/links`) với CRUD link (POST/PATCH/DELETE gate `authz.requireCurate`,
GET công khai), nhưng Admin v2 CHƯA có UI nào tiêu thụ. Trang chi tiết môn hiện chỉ có các tab
Thông tin/Outcomes/Prerequisites/Nhân sự/Resources — thiếu chỗ quản lý khoá học liên kết.

## What Changes

- **Tab mới "Khoá học liên kết"** trên trang chi tiết môn (`SubjectDetailPage`), đặt cạnh các tab
  sub-resource sẵn có, dùng đúng khuôn (AntD Table + Select + `<Can>` + TanStack Query) của
  StaffTab/PrerequisitesTab:
  - **Liệt kê** các khoá đang liên kết với môn — lọc `targetType='course.course'` từ
    `GET /api/v1/subjects/{code}/links`; hiển thị tên khoá (resolve từ danh sách khoá / titleOverride)
    + course id, kèm nút **Gỡ liên kết** (danger confirm).
  - **Thêm liên kết**: picker khoá học (search/select từ `adminCourses`) →
    `POST /links` với `{ tab:'LEARNING', targetType:'course.course', targetId:courseId,
    titleOverride:tên_khoá }`. Hỗ trợ 1 môn ↔ NHIỀU khoá; picker ẩn khoá đã liên kết và FE chặn
    trùng (BE cũng ném `SUBJECT_LINK_DUPLICATE`).
  - Gate control ghi bằng `subject.manage` (khớp StaffTab/PrerequisitesTab; BE `requireCurate` cũng
    thoả bởi `subject.manage` global).
  - Sau add/remove: invalidate query-key `links(code)` + `detail(id)` để danh sách refresh.
- **API layer mới** trong `subjects.api.ts` (dùng `coreClient`, key theo subject CODE, KHÔNG
  hardcode base URL): `useSubjectLinks`, `useAddSubjectLink`, `useRemoveSubjectLink` + type
  `WorkspaceLinkView`/`CreateWorkspaceLinkRequest` + hằng `COURSE_LINK_TARGET_TYPE`/`COURSE_LINK_TAB`.
- Thêm query-key `subjectsKeys.links(code)`.
- Nguồn khoá cho picker: **`useCourses`** (GraphQL `adminCourses`) — tái dùng nguyên của
  course-management, lấy 1 trang lớn rồi tìm client-side (đồng bộ cách PrerequisitesTab lấy môn).

## Capabilities

### New Capabilities
- `admin-subject-course-links`: admin liên kết nhiều khoá học vào một môn (workplace) từ trang chi
  tiết môn — liệt kê khoá đã liên kết, thêm liên kết qua picker khoá, gỡ liên kết; gate
  `subject.manage`; dữ liệu này là nguồn để trang Learn suy ra môn của một khoá.

### Modified Capabilities
<!-- Không sửa capability sẵn có. -->

## Impact

- FE files: `src/features/academic/subjects/api/subjects.api.ts` (+hooks/types links),
  `src/features/academic/subjects/api/subjects.keys.ts` (+`links`),
  `src/features/academic/subjects/components/LinkedCoursesTab.tsx` (mới),
  `src/features/academic/subjects/pages/SubjectDetailPage.tsx` (+tab).
- API BE tiêu thụ (`coreClient`, `/api/v1`, key theo CODE): `GET /subjects/{code}/links`,
  `POST /subjects/{code}/links`, `DELETE /subjects/{code}/links/{id}` (WorkspaceController).
- Picker khoá: GraphQL `adminCourses` qua `useCourses` (đã có).
- KHÔNG đổi BE, KHÔNG route/nav mới, KHÔNG i18n mới (dùng chuỗi tiếng Việt như các tab cùng feature).
- Ghi chú: `LinkView.title = titleOverride` (có thể null cho link cũ tạo nơi khác) — UI resolve tên
  khoá từ `adminCourses` làm phương án dự phòng. `PATCH /links/{id}` (sortOrder/pinned/titleOverride)
  BE có sẵn nhưng chưa dùng ở đợt này (follow-up nếu cần sắp xếp/ghim).
