# Tasks — payroll-instructor-console-fixes

## 1. Payroll bug fixes
- [x] 1.1 payroll.api.ts: update deduction PUT → `/payroll/admin/deductions/{deductionId}`
- [x] 1.2 payroll.api.ts: delete deduction DELETE → `/payroll/admin/deductions/{deductionId}`
- [x] 1.3 routeRegistry.tsx: `/payroll` route gate `payroll.manage` (không `payroll.read`)
- [x] 1.4 PayrollListPage.tsx: "Tổng giảng viên" = distinct instructorId
- [x] 1.5 errors.ts: mã lỗi payroll khớp PayrollError BE

## 2. Instructor console tab scoping
- [x] 2.1 MyCourseDetailPage: ẩn Publish + Kho-thử-thách; Tổng quan view-only
- [x] 2.2 Bỏ import + biến không dùng (PublishTab, CourseChallengeBankTab, canPublish)

## 3. Verify
- [x] 3.1 `tsc --noEmit` sạch + `npm run build` xanh
- [x] 3.2 errors.test.ts 10/10 (sse.test.ts đỏ là pre-existing trên main, không thuộc thay đổi này)
