# Tasks — instructor-workspace

## 1. Feature scaffold
- [ ] 1.1 Tạo folder `src/features/instructor-workspace/` (pages/ api/ components/ shared/) — mirror `src/features/ctv-workspace/`.
- [ ] 1.2 `shared/types.ts`: `Earning`, `PayrollDeduction`, `MyCourseScope` (theo BE payroll DTO; xác nhận field tại `FTES-AOS-Backend/.../payroll/web/` nếu mã BE có sẵn).

## 2. API layer (coreClient — /api/v1)
- [ ] 2.1 `api/payrollMe.keys.ts`: query-key factory (`all`/`earnings`/`current`).
- [ ] 2.2 `api/payrollMe.api.ts` (dùng `coreClient`, KHÔNG `apiClient`):
  - `useMyEarnings()` → GET `/payroll/me/earnings`.
  - `useMyCurrentEarning()` → GET `/payroll/me/earnings/current`.
  - `useRequestPayout()` mutation → POST `/payroll/me/earnings/request-payout`; onSuccess invalidate keys.
- [ ] 2.3 `api/courseScopes.ts`: `useMyCourseScopes()` đọc `useMe().scopedGrants` lọc `scopeType==="COURSE"` còn hiệu lực (mirror `useCtvScopes`).

## 3. Pages
- [ ] 3.1 `pages/InstructorHomePage.tsx`: scope card COURSE + 2 shortcut; empty state khi không còn scope.
- [ ] 3.2 `pages/MyCoursesPage.tsx`: list khoá từ scopes; hạn scope + cảnh báo <7 ngày; nút "Mở".
- [ ] 3.3 `pages/MyCourseDetailPage.tsx`: `ScopeGuard scopeType="COURSE" scopeId={courseId}` bọc component academic (READ/IMPORT `src/features/academic/courses/**`, KHÔNG sửa academic).
- [ ] 3.4 `pages/MyEarningsPage.tsx`: thẻ batch hiện tại (netPayable nổi bật + Tag status) + bảng lịch sử (VND format, deductions expandable) + nút "Yêu cầu chi trả".

## 4. Permission & errors
- [ ] 4.1 Import/clone `ScopeGuard` từ `ctv-workspace/components`; per-course guard.
- [ ] 4.2 Nút payout: enable chỉ khi `status==="OPEN"` && `netPayable>=50000`; `Modal.confirm` nêu OPEN→PENDING trước khi gọi.
- [ ] 4.3 `src/shared/api/errors.ts`: thêm `PAYROLL_BALANCE_NOT_ENOUGH` vào `ADMIN_ERROR_MESSAGES`; mutation dùng `handleAdminMutationError`.

## 5. Routes
- [ ] 5.1 `src/app/routeRegistry.tsx`: thêm `/instructor` (nav đơn, không group, `requiredScope:true`), `/instructor/courses`, `/instructor/courses/:courseId`, `/instructor/earnings` (đều `requiredScope:true`).

## 6. Verify
- [ ] 6.1 `npm run build` xanh + `tsc --noEmit` sạch.
- [ ] 6.2 e2e tay (apitest, account LECTURER): mở `/instructor` → mở 1 khoá của mình → lách URL sang khoá khác thấy 403 → mở `/instructor/earnings` → yêu cầu chi trả (đủ số dư) → thử batch <50000 thấy lỗi tiếng Việt.
