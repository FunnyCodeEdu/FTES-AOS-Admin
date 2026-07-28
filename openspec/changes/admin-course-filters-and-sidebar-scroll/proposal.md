## Why

Ba điểm cản trở quản lý hằng ngày trên admin:

1. **Trang Khoá học không có ô tìm kiếm theo tên.** Backend + hook đã nhận `search` (map sang
   filter `q` trong `buildAdminCourseFilter`) và `parseParams`/`buildSearchParams` đã thread qua URL,
   nhưng UI chỉ có Select môn (disabled) + Select loại — **thiếu đúng ô nhập** để dùng đường dẫn đó.
2. **Không lọc được theo trạng thái khoá học** (đang xuất bản / nháp / chờ duyệt / lưu trữ). Cũng như
   trên, `params.status` đã được thread tới BE (`status.toUpperCase()`) nhưng thiếu Select.
3. **Menu điều hướng bên trái không cuộn được.** `Sider` cố định full-height chứa logo + `NavMenu`
   nhưng không có vùng cuộn → khi danh sách mục dài hơn viewport, các mục dưới cùng không với tới.

## What Changes

- `CourseListPage`: thêm `Input.Search` (bind `filterValues.search`, submit qua `onSearch`, xoá qua
  `allowClear`/empty) và `Select` trạng thái (`published/draft/review/archived`, nhãn tiếng Việt).
  Không đổi hook/BE — chỉ nối UI vào plumbing sẵn có.
- `AdminLayout`: `Sider` bọc nội dung thành flex-column (logo cố định + vùng `NavMenu` `flex:1
  overflow-y:auto`), chừa `paddingBottom` cho thanh trigger thu gọn → nav dài cuộn được.

## Capabilities

### Modified Capabilities

- `academic-course-console`: thêm bộ lọc tìm kiếm theo tên + lọc theo trạng thái trên danh sách khoá học.
- `admin-app-shell`: menu điều hướng bên trái cuộn được khi dài hơn viewport.
