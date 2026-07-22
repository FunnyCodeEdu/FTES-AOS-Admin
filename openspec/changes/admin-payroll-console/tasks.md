# Tasks — admin-payroll-console

## 1. Feature scaffold
- [ ] 1.1 Tạo folder `src/features/payroll/` (pages/ api/ components/ types).
- [ ] 1.2 `types.ts`: `Earning`, `PayrollDeduction`, `PayrollConfig`, `PayrollListParams` (theo BE payroll DTO; xác nhận field tại `FTES-AOS-Backend/.../payroll/web/` nếu mã BE có sẵn).

## 2. API layer (coreClient — /api/v1)
- [ ] 2.1 `api/payroll.keys.ts`: query-key factory (`list`/`detail`/`config`) mirror `courses.keys.ts`.
- [ ] 2.2 `api/payroll.api.ts` (dùng `coreClient`, KHÔNG `apiClient`):
  - `usePayrollList(params)` GET `/payroll/admin/earnings` (`keepPreviousData`).
  - `usePayrollDetail(id)` GET `/payroll/admin/earnings/{id}`.
  - `usePayrollConfig()` GET `/payroll/admin/config`.
  - Mutations: `useUpdateAllowance` (PUT allowance), `useAddDeduction` (POST deductions),
    `useUpdateDeduction` (PUT deductions/{id}), `useDeleteDeduction` (DELETE deductions/{id}),
    `useUpdateStatus` (POST status). onSuccess invalidate detail + lists.

## 3. Pages
- [ ] 3.1 `pages/PayrollListPage.tsx`: server-table pattern (`useSearchParams`↔params, skeleton/empty/error) + 4 stat card + search tên + filter status + cột theo legacy Salary (VND format, status Tag). Select đổi trạng thái bọc `<Can permissions={["payroll.manage"]}>`.
- [ ] 3.2 `pages/PayrollDetailPage.tsx` (trang hoặc Drawer): `Descriptions` batch + sửa phụ cấp (disable khi !OPEN) + bảng khoản trừ (thêm/sửa/xoá) + đổi trạng thái mark-paid. Thao tác bọc `<Can permissions={["payroll.manage"]}>`.
- [ ] 3.3 `components/DeductionModal.tsx` (`{type,amount,description}`) + `components/PayrollStatCards.tsx`.

## 4. Permission & dangerous-action
- [ ] 4.1 Route gate `requiredPermissions: ["payroll.read"]`; nút quản lý gate `payroll.manage` qua `<Can>`.
- [ ] 4.2 Đổi trạng thái CLOSE (mark-paid) → `Modal.confirm okType="danger"` nêu không hoàn tác; xoá deduction → `Popconfirm okType="danger"`.
- [ ] 4.3 `src/shared/api/errors.ts`: thêm `PAYROLL_BALANCE_NOT_ENOUGH`, `PAYROLL_INVALID_STATUS`, `PAYROLL_NOT_FOUND`, `PAYROLL_LOCKED` vào `ADMIN_ERROR_MESSAGES`; mutation dùng `handleAdminMutationError`.

## 5. Routes
- [ ] 5.1 `src/app/routeRegistry.tsx`: thêm `/payroll` (nav `{label:"Lương", group:"Nhân sự"}`, `payroll.read`) + `/payroll/:id` (`payroll.read`).

## 6. Verify
- [ ] 6.1 `npm run build` xanh + `tsc --noEmit` sạch.
- [ ] 6.2 e2e tay (apitest, account super-admin có `payroll.manage`): mở `/payroll` → stat card đúng → sửa phụ cấp batch OPEN → thêm/xoá khoản trừ → mark-paid PENDING→CLOSE. Kiểm bằng account chỉ `payroll.read`: thấy bảng, không thấy nút quản lý.
