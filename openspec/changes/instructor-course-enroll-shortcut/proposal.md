## Why

Admin/giảng viên vào trang **Khoá của tôi** (`/instructor/courses`) không thêm được học viên vào
chính khoá mình phụ trách: cả trang chỉ có một nút "Mở". Muốn cấp một học viên phải rời khu giảng
viên, sang khu quản trị khoá học, tìm lại đúng khoá rồi mới thấy nút cấp — trong khi danh sách khoá
của mình đang ở ngay trước mặt.

## What Changes

- Mỗi khoá trong danh sách có nút **Thêm học viên** mở thẳng luồng cấp hàng loạt theo username đang
  dùng ở khu quản trị (một luồng, một chỗ sửa).
- Nút gate theo đúng quyền backend đang gác (`admin.course.manage`) — không bày nút để rồi bấm xong
  nhận 403.
- Bảng chuyển sang `ResponsiveTable`: trên điện thoại mỗi khoá là một thẻ, nút Thêm học viên
  full-width đứng đầu.

## Capabilities

### New Capabilities
- `instructor-course-enroll`: Cấp học viên vào khoá mình phụ trách ngay trong khu giảng viên.

### Modified Capabilities
<!-- không có -->

## Impact

- `src/features/instructor-workspace/pages/MyCoursesPage.tsx`
- Dùng lại `GrantEnrollmentModal` + `ResponsiveTable` + `MobileCard` sẵn có; không thêm API mới.
