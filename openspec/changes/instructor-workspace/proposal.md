# instructor-workspace — Console scoped cho giảng viên (khoá học của tôi + lương của tôi)

## Why

Tầng CTV trong `docs/ADMIN-ARCHITECTURE.md` đã có template console scoped (`/ctv/*`:
`requiredScope: true`, không nav.group, dữ liệu tự lọc theo scope grant). Giảng viên
(LECTURER) cũng là một tầng scoped — được cấp **scoped grant `scopeType: "COURSE"`** trên
đúng các khoá mình dạy — nhưng chưa có console self-service. Họ cần:

1. Xem đúng các khoá mình phụ trách (không thấy khoá của người khác) và mở lại các thành
   phần nội dung khoá (đọc/soạn) qua đúng component academic console đã có.
2. Tự xem bảng lương của mình và yêu cầu chi trả — BE vừa ship:
   - `GET /api/v1/payroll/me/earnings` (các dòng lương của chính mình, owner ép từ JWT)
   - `GET /api/v1/payroll/me/earnings/current` (batch OPEN hiện tại)
   - `POST /api/v1/payroll/me/earnings/request-payout` (OPEN → PENDING; 400
     `PAYROLL_BALANCE_NOT_ENOUGH` nếu `netPayable < 50000`)

Console này KHÔNG được lộ dữ liệu ngoài scope (mirror nguyên tắc CTV) và tuyệt đối không
gate bằng role string — chỉ theo COURSE-scope grant + trạng thái đăng nhập (CLAUDE.md).

## What Changes

- **Console scoped mới `/instructor/*`** (clone template `/ctv/*`), layout `admin`,
  `requiredScope: true`, không có `nav.group` (rail workspace riêng, không trộn nav quản trị):
  - `/instructor` — trang chủ workspace: các COURSE-scope card (từ `scopedGrants`) + shortcut
    sang "Khoá của tôi" và "Lương của tôi".
  - `/instructor/courses` — **MyCourses**: liệt kê đúng các khoá có COURSE-scope grant còn
    hiệu lực; mỗi khoá mở chi tiết qua **component academic đã có** (READ/IMPORT
    `src/features/academic/courses/**`, KHÔNG sửa) bọc trong `ScopeGuard` COURSE.
  - `/instructor/courses/:courseId` — chi tiết khoá của tôi, `ScopeGuard scopeType="COURSE"
    scopeId=:courseId`; tái dùng khối trình bày khoá/cây nội dung của academic console.
  - `/instructor/earnings` — **MyEarnings**: bảng lương của chính mình + thẻ batch hiện tại
    + nút "Yêu cầu chi trả".
- **API client mới** `src/features/instructor-workspace/api/payrollMe.api.ts` dùng
  **`coreClient`** (`/api/v1`, KHÔNG phải `apiClient` `/api/v1/admin`) cho `/payroll/me/*`.
- **Feature folder mới** `src/features/instructor-workspace/**` (pages + api + components +
  shared/types); các trang KPI/scope tái dùng pattern `ctv-workspace`.
- Thêm route vào `src/app/routeRegistry.tsx`; thêm mã lỗi payroll vào
  `src/shared/api/errors.ts` (`PAYROLL_BALANCE_NOT_ENOUGH`).

## Capabilities

### New Capabilities
- `instructor-workspace`: console scoped cho LECTURER — MyCourses (khoá của mình, tái dùng
  component academic sau COURSE-scope guard) + MyEarnings (tự xem lương + yêu cầu chi trả).

### Modified Capabilities
<!-- Không sửa capability sẵn có. Academic course console chỉ được READ/IMPORT, không đổi. -->

## Impact

- Route mới: `/instructor`, `/instructor/courses`, `/instructor/courses/:courseId`,
  `/instructor/earnings` (routeRegistry, `requiredScope: true`).
- Feature folder mới `src/features/instructor-workspace/**`.
- API BE tiêu thụ (`coreClient`, `/api/v1`): `GET /payroll/me/earnings`,
  `GET /payroll/me/earnings/current`, `POST /payroll/me/earnings/request-payout`.
- Permission gate: `requiredScope: true` (cần ≥1 COURSE-scope grant còn hiệu lực) +
  `ScopeGuard scopeType="COURSE"` per-course; lương self-view ép owner theo JWT ở BE.
- `src/shared/api/errors.ts` +1 mã lỗi `PAYROLL_BALANCE_NOT_ENOUGH`.
- Auth: phiên đăng nhập native BE hiện có; account LECTURER trong bộ test 4 role.
- KHÔNG chạm `src/features/academic/**` ngoài việc READ/IMPORT component khoá học.
