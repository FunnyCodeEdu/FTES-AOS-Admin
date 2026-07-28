# Tasks

## 1. Course list filters (academic-course-console)
- [x] 1.1 Thêm `Input.Search` (tìm theo tên) vào thanh filter `CourseListPage`, bind `filterValues.search`
- [x] 1.2 Thêm `Select` trạng thái (published/draft/review/archived) bind `filterValues.status`
- [x] 1.3 Không đổi hook/BE — dùng plumbing `search`→`q` và `status` sẵn có; reset page=1 khi đổi filter

## 2. Sidebar scroll (admin-app-shell)
- [x] 2.1 `Sider` content thành flex-column: logo cố định + vùng `NavMenu` `flex:1 overflow-y:auto`
- [x] 2.2 `paddingBottom` chừa thanh trigger thu gọn (48px) để mục cuối không bị che

## 3. Verify
- [x] 3.1 `npm run build` (tsc -b && vite build) xanh
- [x] 3.2 `openspec validate admin-course-filters-and-sidebar-scroll --strict`
