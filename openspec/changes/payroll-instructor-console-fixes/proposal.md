## Why

Review sau khi ship `admin-payroll-console` + `instructor-workspace` phát hiện 5 lỗi payroll và 1 khoảng
cách authz ở instructor console:

- **2 BLOCKER**: URL sửa/xoá khoản trừ sai (`/payroll/admin/earnings/deductions/{id}`) — BE thật là
  `/payroll/admin/deductions/{id}` → **404**, không sửa/xoá được khoản trừ.
- **1 MAJOR**: route `/payroll` (console admin tổng) gate `payroll.read` — nhưng LECTURER cũng có
  `payroll.read` (để xem lương của mình) → thấy nav "Lương" rồi vào trang gọi API admin bị **403**.
- **2 MINOR**: card "Tổng giảng viên" đếm số **kỳ lương** thay vì số GV (thổi phồng sau payout); map
  error-code payroll sai tên (`PAYROLL_INVALID_STATUS/NOT_FOUND/LOCKED` không khớp BE → mất bản địa hoá).
- **Instructor console**: MyCourseDetailPage bày cả tab **Publish** + **Kho thử thách** vốn cần quyền
  admin GLOBAL (`course.publish` / `admin.challenge.manage`) mà LECTURER không có → tab bấm vào 403; và
  tab "Tổng quan" cho sửa tên/tóm tắt đi qua admin PATCH (`admin.course.manage` GLOBAL) → 403.

## What Changes

- Sửa URL deduction update/delete → `/payroll/admin/deductions/{deductionId}`.
- `/payroll` route gate `payroll.manage` (chỉ admin). Self-view của GV giữ ở `/instructor/earnings`
  (COURSE-scope), không đổi.
- Card "Tổng giảng viên" = số instructorId **duy nhất**.
- Map error-code payroll khớp `PayrollError` BE (ILLEGAL_TRANSITION / EARNING_NOT_FOUND /
  EARNING_NOT_OPEN / DEDUCTION_NOT_FOUND / INVALID_AMOUNT / NO_OPEN_BATCH / FORBIDDEN).
- Instructor MyCourseDetailPage: chỉ giữ tab owner-authz (Tổng quan **view-only**, Nội dung, Giá & gói,
  Học thử); **ẩn** Publish + Kho thử thách (defer tới khi BE mở owner-authz cho 2 surface đó).

## Capabilities

### New Capabilities

- `payroll-instructor-console-fixes`: console payroll admin gọi đúng endpoint BE + gate đúng quyền +
  thống kê/thông báo chính xác; instructor course workspace chỉ bày các tab đã owner-authz.

## Impact

- `src/features/payroll/api/payroll.api.ts` (2 URL), `pages/PayrollListPage.tsx` (stat),
  `src/shared/api/errors.ts` (mã lỗi), `src/app/routeRegistry.tsx` (route gate),
  `src/features/instructor-workspace/pages/MyCourseDetailPage.tsx` (tab scoping).
- Không đổi BE (riêng owner-authz đọc course là change BE `instructor-owner-course-read`). Build xanh +
  `tsc --noEmit` sạch; errors.test.ts 10/10.
- **Defer**: sửa tên khoá cho instructor (reroute `useUpdateCourse` title/desc sang core PATCH) +
  Publish/Kho-thử-thách owner-authz — mỗi việc là change riêng có đổi hành vi write dùng chung của dev A.
