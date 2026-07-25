# admin-payroll-console — Console lương hệ thống cho super-admin

## Why

Admin cũ (`FunnyCodeEdu-frontend-admin/src/pages/Salary` + `PersonSalary`) có màn quản lý
lương 2-role: bảng tất cả nhân viên + stat card + sửa phụ cấp/chi phí + đổi trạng thái chi
trả. Admin v2 chưa port. BE payroll vừa ship bộ endpoint `/api/v1/payroll/admin/*` để
super-admin quản lý lương của **mọi giảng viên**:
- `GET /api/v1/payroll/admin/earnings` (list toàn bộ; lazily đảm bảo mỗi giảng viên có 1 batch OPEN)
- `GET /api/v1/payroll/admin/earnings/{id}`
- `PUT /api/v1/payroll/admin/earnings/{id}/allowance` `{allowance}`
- `POST /api/v1/payroll/admin/earnings/{id}/deductions` `{type,amount,description}`
- `PUT /api/v1/payroll/admin/earnings/deductions/{id}` · `DELETE /api/v1/payroll/admin/earnings/deductions/{id}`
- `POST /api/v1/payroll/admin/earnings/{id}/status` `{status}` (PENDING → CLOSE = mark-paid)
- `GET /api/v1/payroll/admin/config`

Cần một console mới trong admin v2 port lại cột/thao tác của màn legacy (đã đọc), chuyển sang
AntD 5 + **gate theo permission leaf `payroll.read`/`payroll.manage`** (KHÔNG role string —
đây chính là điều admin cũ làm sai, CLAUDE.md cấm).

## What Changes

- **Console mới `/payroll/*`** (nhóm nav "Nhân sự" / "Lương"), layout `admin`:
  - `/payroll` — **PayrollListPage**: bảng mọi dòng lương giảng viên + 3–4 stat card (tổng
    quỹ, đã trả, đang chờ, số giảng viên) + tìm kiếm theo tên + filter status; mỗi dòng có
    nút xem chi tiết và (khi có `payroll.manage`) select đổi trạng thái. Đọc `payroll.read`.
  - `/payroll/:id` — **PayrollDetailPage** (hoặc drawer): thông tin batch + sửa **phụ cấp**
    (`PUT .../allowance`) + bảng **khoản trừ** (thêm/sửa/xoá deduction) + đổi trạng thái
    (PENDING → CLOSE mark-paid). Sửa/thao tác cần `payroll.manage`.
- **API client mới** `src/features/payroll/api/payroll.api.ts` dùng **`coreClient`**
  (`/api/v1`, KHÔNG `apiClient` `/api/v1/admin`).
- Server-table pattern (`useSearchParams` ↔ params, `useQuery` keepPrevious, skeleton/empty/
  error) theo `CourseListPage`; query-key factory `payroll.keys.ts`.
- Dangerous-action: đổi trạng thái + xoá deduction dùng `Modal.confirm`/`Popconfirm`
  `okType="danger"`; map mã lỗi payroll vào `src/shared/api/errors.ts`.
- Thêm route + nav vào `src/app/routeRegistry.tsx`.

## Capabilities

### New Capabilities
- `admin-payroll-console`: super-admin quản lý lương toàn hệ thống — list mọi giảng viên +
  stat card + sửa phụ cấp/khoản trừ + điều khiển trạng thái (mark-paid), gate
  `payroll.read`/`payroll.manage`.

### Modified Capabilities
<!-- Không sửa capability sẵn có. -->

## Impact

- Route mới: `/payroll` (nav, `payroll.read`), `/payroll/:id` (`payroll.read`; thao tác cần `payroll.manage`).
- Feature folder mới `src/features/payroll/**`.
- API BE tiêu thụ (`coreClient`, `/api/v1`): `/payroll/admin/earnings*`, `.../allowance`,
  `.../deductions*`, `.../status`, `/payroll/admin/config`.
- Permission gates: `requiredPermissions: ["payroll.read"]` cho route; `<Can permissions={["payroll.manage"]}>`
  bọc nút sửa/xoá/đổi trạng thái.
- `src/shared/api/errors.ts` +mã lỗi payroll (`PAYROLL_*`).
- RBAC leaves mới cần có ở BE + catalog: `payroll.read`, `payroll.manage`.
