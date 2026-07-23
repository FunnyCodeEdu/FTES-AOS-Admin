## Why

BE đã mở owner-authz cho sửa tên khoá (core PATCH) + Publish/Unpublish + Kho thử thách
(instructor-owner-course-read + instructor-publish-challenge-authz). Giờ bỏ 2 hạn chế tạm ở instructor
console (đặt ở payroll-instructor-console-fixes): tab Tổng quan view-only + ẩn Publish/Kho-thử-thách.

## What Changes

- `useUpdateCourse`: title/description ĐI QUA **core PATCH** `/courses/{id}` (CatalogService.update
  owner-authz) thay vì admin PATCH (admin.course.manage GLOBAL) → giảng viên sửa tên/tóm tắt khoá MÌNH.
  subjectId (core không nhận, disabled với instructor) vẫn đi admin PATCH. saleMode giữ core.
- `MyCourseDetailPage`: Tổng quan editable trở lại (`readOnly={readOnly}`); **bỏ ẩn** tab Publish
  (gate readOnly||!canPublish) + Kho thử thách (dưới canManage).

## Capabilities

### New Capabilities

- `instructor-publish-challenge-ui`: instructor console cho phép sửa tên khoá + Publish + quản kho
  challenge của khoá mình (khớp owner-authz BE).

## Impact

- `src/features/academic/courses/api/courses.api.ts` (reroute useUpdateCourse) + test.
- `src/features/instructor-workspace/pages/MyCourseDetailPage.tsx` (un-hide tab + un-force readOnly).
- Không đổi BE. Build xanh + tsc sạch; courses.api.test 32/32.
