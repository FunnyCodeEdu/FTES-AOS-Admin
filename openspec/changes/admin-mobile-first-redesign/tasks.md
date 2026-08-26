# Tasks — admin-mobile-first-redesign

## 1. Giữ phiên đăng nhập

- [x] 1.1 `store.ts`: `remember` mặc định `true` khi chưa có lựa chọn nào lưu trên máy
- [x] 1.2 `LoginPage.tsx`: ô tick mặc định bật, đổi nhãn thành "Giữ đăng nhập trên thiết bị này"
- [x] 1.3 Test đơn vị: chưa có gì trong storage → `remember=true`; đã bỏ tick → vẫn `sessionStorage`

## 2. Lớp nền responsive toàn cục (mọi trang được hưởng, không sửa từng file)

- [x] 2.1 `src/shared/styles/mobile.css`: dưới `md` thì bảng cuộn ngang thay vì bóp cột; modal ≥96vw
      sát mép trên; drawer full-width; form dồn nhãn lên trên; tab nav cuộn ngang; nút nhỏ vẫn ≥36px
- [x] 2.2 `ConfigProvider`: `componentSize="large"` khi ở điện thoại để mọi ô nhập/nút đạt vùng chạm
- [x] 2.3 Kiểm không đổi gì trên desktop (mọi rule nằm trong `@media (max-width: 767px)`)

## 3. Primitive dùng chung

- [x] 3.1 `shared/components/ResponsiveTable.tsx` — props của `Table` + `renderMobileCard`
- [x] 3.2 `shared/components/PageHeader.tsx` — tiêu đề + hàng nút, xuống dòng full-width trên mobile
- [x] 3.3 `shared/components/MobileCard.tsx` — khung thẻ: tiêu đề, dòng phụ, nút chính, menu phụ
- [x] 3.4 Test đơn vị: `isMobile=false` render `Table`; `isMobile=true` render thẻ

## 4. Trang chủ — lối tắt việc hay làm

- [x] 4.1 `features/dashboard/QuickActions.tsx` — khai báo dạng dữ liệu, gate quyền, đích lương theo quyền
- [x] 4.2 `features/dashboard/QuickEnrollModal.tsx` — chọn khoá (ô tìm) rồi mở luồng cấp học viên sẵn có
- [x] 4.3 Gắn vào `DashboardPage` phía TRÊN `WidgetGrid`, độc lập với lỗi widget
- [x] 4.4 Test đơn vị: thiếu quyền thì ẩn thẻ; `payroll.read` → `/instructor/earnings`

## 5. Trang khoá học

- [x] 5.1 Ô tìm lớn (≥44px) full-width trên mobile, có nút xoá nhanh
- [x] 5.2 `CourseTable` dùng `ResponsiveTable`: thẻ gồm tên, trạng thái, số học viên, giá
- [x] 5.3 Nút "Thêm học viên" full-width đứng đầu thẻ, gate `course.update`; thao tác phụ vào menu

## 6. Áp cho các tab hay dùng khác

- [x] 6.1 Lương (`PayrollListPage`) — thẻ: kỳ, giảng viên, số tiền, trạng thái
- [x] 6.2 Môn học (`SubjectTable`) — thẻ: mã, tên, kì, ngành, trạng thái
- [x] 6.3 Chương trình thưởng (`CampaignListPage`) — thẻ: tên, Xu, thời gian, đã phát
- [x] 6.4 Người dùng (`UserTable`) — thẻ: tên, email, vai trò, trạng thái
- [x] 6.5 Đơn hàng / thanh toán — thẻ: mã đơn, khách, số tiền, trạng thái
- [x] 6.6 Kho challenge — thẻ: tên bài, tag, độ khó
- [x] 6.7 Duyệt học liệu — thẻ: tiêu đề, người gửi, trạng thái + nút duyệt/từ chối

## 7. Chốt

- [x] 7.1 `npm run build` xanh
- [x] 7.2 `npx vitest run` xanh
- [x] 7.3 Xem thử ở 375px: trang chủ, khoá học, lương không cuộn ngang
