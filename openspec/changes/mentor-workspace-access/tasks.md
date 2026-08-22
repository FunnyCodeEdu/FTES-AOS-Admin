# Tasks — mentor-workspace-access

## 1. Cổng quyền khu giảng viên
- [x] 1.1 `/instructor/courses` + `/instructor/courses/:courseId` gác `course.manage | course.content.edit`
- [x] 1.2 Rail `/instructor` nhận thêm `course.content.edit`
- [x] 1.3 Đính chính chú thích "LECTURER có course.manage từ V14" (V27 đã thu hồi)

## 2. Lối đi tới lương và khoá
- [x] 2.1 Nav riêng cho `/instructor/courses` và `/instructor/earnings`, group "Giảng viên"
- [x] 2.2 `InstructorHomePage`: nguồn khoá = ownership (`/courses/teaching`) ∪ COURSE-scope grant
- [x] 2.3 Rỗng chỉ làm rỗng thẻ "Khoá của tôi", KHÔNG chặn cả trang

## 3. Danh tính người đăng nhập
- [x] 3.1 Query `Me` hỏi thêm `user { id username displayName }` (đã introspect BE apitest)
- [x] 3.2 `useMe` map id/fullName thật; email giữ từ store (PublicUser không có field email)
- [x] 3.3 `MyCourseDetailPage`: `canManage` = manage detail tải được (BE đã gác), bỏ so id ở FE

## 4. Verify
- [x] 4.1 `tsc --noEmit` sạch + `npm run build` xanh
- [x] 4.2 `routeRegistry.test.tsx` 9 ca + `instructorWorkspaceAccess.test.tsx` 5 ca xanh
- [x] 4.3 Toàn bộ vitest của repo xanh (không hồi quy)
- [ ] 4.4 Browser E2E do người dùng chạy local (`npm run dev`, đăng nhập instructor.test) — server
      không chạy FE theo thoả thuận
