# admin-course-package-editor — nối tab "Giá & gói" vào API gói thật

## Why

`PricingTab` render một `Form.List name="packages"` (tên gói / giá / entitlements) trông như thật,
nhưng **không có gì được lưu**:

- `useUpdateCoursePricing` (`courses.api.ts:346`) chỉ `PATCH /courses/{id}` với `totalPrice`; comment
  trong code ghi thẳng `packages: no BE counterpart on PATCH /courses/{id}`. Bấm "Lưu pricing" →
  gói vừa nhập biến mất, KHÔNG báo lỗi.
- Mapper detail hardcode `packages: []` (`courses.api.ts:113`) → gói thật của khoá không bao giờ hiện.
- `POST /courses/{id}/packages` của BE tồn tại nhưng admin không gọi. Entitlement trong form là một
  textarea "JSON hoặc mô tả", trong khi BE cần `type: PART|LESSON|EXERCISE` + `sectionId`/`lessonId`/
  `selectedLessonIds`/`freeLessonIds`.

Hệ quả nghiêm trọng: `CourseInfoTab` ĐÃ cho admin đổi "Loại khoá học" LEGACY → PACKAGE bằng một
dropdown, mà admin lại không có cách nào tạo gói → khoá vừa đổi thành không bán được. Change BE
`course-legacy-package-upgrade` vá phần dữ liệu (tự tạo gói `Trọn khoá` + giữ quyền học viên cũ);
change này lo phần admin thực sự quản được gói sau đó.

## What Changes

- **Thay form gói giả bằng editor thật**, chạy trên API mới của BE:
  `GET /courses/{id}/packages/admin`, `POST /courses/{id}/packages`,
  `PATCH /courses/{id}/packages/{packageId}`, `DELETE /courses/{id}/packages/{packageId}`.
  Mỗi gói lưu bằng lệnh riêng — bỏ mô hình "lưu cả mảng trong 1 nút".
- **Entitlement chọn bằng cây khoá học, không gõ JSON**: mỗi gói có danh sách entitlement, mỗi dòng
  chọn `PART` (chọn section) hoặc `LESSON` (chọn bài), kèm ô chọn nhiều bài "học thử miễn phí"
  (`freeLessonIds`). Dữ liệu section/lesson lấy từ `course.tree` đã có sẵn trong `CourseDetail`.
- **Tách `basePrice` khỏi gói**: nút "Lưu pricing" chỉ còn lo `totalPrice` như hiện tại; khu vực gói
  có nút lưu/xoá riêng từng gói + confirm khi ngừng bán (theo luật "mutation nguy hiểm có confirm").
- **Cảnh báo trước khi đổi LEGACY → PACKAGE** ở `CourseInfoTab`: confirm nêu rõ một chiều, không
  hoàn tác được, hệ thống sẽ tự tạo gói "Trọn khoá" và giữ quyền cho học viên đang học.
- Khoá LEGACY: giữ Alert hiện có, khu vực gói read-only, chỉ dẫn sang tab Tổng quan để đổi loại khoá.

## Impact

- Affected specs: `academic-course-console` (ADDED).
- Affected code: `features/academic/courses/components/PricingTab.tsx`, `CourseInfoTab.tsx`,
  `features/academic/courses/api/courses.api.ts`, `features/academic/types/index.ts`.
- Phụ thuộc: BE change `course-legacy-package-upgrade` phải lên trước (3 endpoint admin).

## Non-goals

- Kéo-thả sắp xếp gói (dùng ô `sortOrder` số).
- Entitlement `EXERCISE` — BE nhận, nhưng cây bài tập chưa có trong `course.tree`; để lần sau.
