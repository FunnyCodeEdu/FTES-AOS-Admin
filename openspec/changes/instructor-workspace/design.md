# Design — instructor-workspace

Template gốc: `src/features/ctv-workspace/**` + route `/ctv` (`requiredScope: true`,
không `nav.group`). Mọi quyết định dưới đây bám sát template đó, đổi domain sang COURSE +
payroll self-service.

## 1. Route & màn hình

Thêm vào `src/app/routeRegistry.tsx` (sau cụm `/ctv/*`):

| Path | Element | layout | gate | nav |
|---|---|---|---|---|
| `/instructor` | `InstructorHomePage` | admin | `requiredScope: true` | `{ label: "Giảng viên", icon: <ReadOutlined /> }` (không group) |
| `/instructor/courses` | `MyCoursesPage` | admin | `requiredScope: true` | — |
| `/instructor/courses/:courseId` | `MyCourseDetailPage` | admin | `requiredScope: true` | — |
| `/instructor/earnings` | `MyEarningsPage` | admin | `requiredScope: true` | — |

- `requiredScope: true` = `PermissionRoute` chỉ cho vào khi có ≥1 grant còn hiệu lực có
  `scopeId` (giống `/ctv`). Trang con còn bọc thêm `ScopeGuard` để chặn theo TỪNG course.
- Chỉ trang chủ có `nav` (một mục đơn, không `group`) → rail workspace riêng, không lẫn nav
  quản trị; các trang con điều hướng nội bộ từ card/nút (mirror `/ctv`).

Thành phần chính từng màn:
- **InstructorHomePage**: `hook useMyCourseScopes()` (đọc `me.scopedGrants` lọc
  `scopeType === "COURSE"` còn hiệu lực, mirror `useCtvScopes`) → grid `ScopeCard` (tái dùng
  hoặc clone `ctv-workspace/components/ScopeCard`) + 2 shortcut card ("Khoá của tôi",
  "Lương của tôi"). Empty state khi không còn COURSE scope (mirror `/ctv` all-expired).
- **MyCoursesPage**: bảng/list các khoá từ COURSE scopes; mỗi dòng nút "Mở" →
  `/instructor/courses/:courseId`. Cột: tên khoá, hạn scope, cảnh báo nếu sắp hết hạn (<7 ngày).
- **MyCourseDetailPage**: `ScopeGuard scopeType="COURSE" scopeId={courseId}` bọc khối trình
  bày khoá tái dùng từ academic console (READ/IMPORT các component trong
  `src/features/academic/courses/**` — vd panel tổng quan + cây nội dung; KHÔNG import trang
  có nút hành động quản trị vượt quyền). BE tự gác ownership theo scope → 403 nếu lách URL.
- **MyEarningsPage**: (chi tiết §5) thẻ batch hiện tại + bảng lịch sử + nút "Yêu cầu chi trả".

## 2. Permission gates

- **Vào console**: `requiredScope: true`. Người không có COURSE-scope grant nào còn hiệu lực
  → `/403` với `scopeMessage` (mirror `PermissionRoute` §requiredScope).
- **Per-course**: `ScopeGuard scopeType="COURSE" scopeId={courseId}` (component sẵn có
  `src/features/ctv-workspace/components/ScopeGuard.tsx` — có thể import trực tiếp hoặc clone
  vào feature mới). Lách URL sang course ngoài scope → `Navigate` `/403`, KHÔNG phát request
  dữ liệu course đó, KHÔNG lộ tên khoá.
- **Payroll self-view**: các endpoint `/payroll/me/*` **ép owner theo JWT** ở BE — FE không
  cần permission leaf riêng; chỉ hiển thị lương của chính người đăng nhập. Nút "Yêu cầu chi
  trả" chỉ enable khi batch hiện tại `status === "OPEN"` và `netPayable >= 50000`.
- **KHÔNG role gating**: tuyệt đối không `role === "LECTURER"`; điều kiện là COURSE-scope
  grant (nav/route/guard) — theo CLAUDE.md.
- CTV/giảng viên khác mở URL `/instructor/courses/:id` ngoài scope → 403 (không leak).

## 3. API contract tiêu thụ (`coreClient` = `/api/v1`, envelope `{code,message,data}`)

> Client: `src/features/instructor-workspace/api/payrollMe.api.ts` dùng **`coreClient`**
> (interceptor tự gắn Bearer + bóc `envelope.data` + refresh-401). KHÔNG dùng `apiClient`
> (đó là `/api/v1/admin`, sai base cho payroll).

| Method | Path | Owner | Request | Response `data` |
|---|---|---|---|---|
| GET | `/payroll/me/earnings` | JWT | — | `Earning[]` |
| GET | `/payroll/me/earnings/current` | JWT | — | `Earning` (batch OPEN hiện tại) |
| POST | `/payroll/me/earnings/request-payout` | JWT | — (owner ép JWT) | `Earning` (đã sang PENDING) |

`Earning` (theo BE payroll DTO đã ship — **assumption về tên field, xác nhận lại tại
`FTES-AOS-Backend/.../payroll/web/` khi implement nếu repo BE đã có mã**):

```ts
interface PayrollDeduction { id: string; type: string; amount: number; description?: string }
interface Earning {
  id: string; instructorId: string; instructorName: string;
  grossRevenue: number; allowance: number; totalDeduction: number; netPayable: number;
  status: "OPEN" | "PENDING" | "CLOSE"; deductions: PayrollDeduction[];
  createdAt: string; paidAt: string | null; active: boolean;
}
```

- `request-payout` lỗi `400` với `errorCode: "PAYROLL_BALANCE_NOT_ENOUGH"` khi
  `netPayable < 50000` → `normalizeError` giữ `errorCode` trong `ApiError.errorCode`; map sang
  message tiếng Việt trong `src/shared/api/errors.ts` (§6).
- Danh sách khoá của tôi: KHÔNG có endpoint payroll riêng — nguồn là `me.scopedGrants`
  (COURSE) + chi tiết khoá lấy qua **API academic course sẵn có** (component academic tự gọi).

## 4. State & data

- Query-key factory `src/features/instructor-workspace/api/payrollMe.keys.ts`:
  ```ts
  export const payrollMeKeys = {
    all: ["payroll", "me"] as const,
    earnings: () => [...payrollMeKeys.all, "earnings"] as const,
    current: () => [...payrollMeKeys.all, "current"] as const,
  };
  ```
- Hooks (TanStack Query, `keepPreviousData` cho list):
  - `useMyEarnings()` → GET `/payroll/me/earnings`.
  - `useMyCurrentEarning()` → GET `/payroll/me/earnings/current`.
  - `useRequestPayout()` (mutation) → POST `request-payout`; onSuccess invalidate
    `payrollMeKeys.earnings()` + `payrollMeKeys.current()`.
- `useMyCourseScopes()` (không query — đọc `useMe().scopedGrants`, mirror `useCtvScopes`):
  lọc `scopeType === "COURSE"` + `hasScopedPermission` còn hiệu lực; gom theo `scopeId`.

## 5. Luồng nghiệp vụ chính

1. **Mở MyEarnings**: vào `/instructor/earnings` → `useMyCurrentEarning` + `useMyEarnings`
   song song → thẻ batch hiện tại (grossRevenue, allowance, totalDeduction, **netPayable** nổi
   bật, status Tag) + bảng lịch sử (cột: ngày tạo, gross, phụ cấp, tổng trừ, thực nhận, trạng
   thái, ngày trả). Deductions hiện dạng expandable row (mirror PersonSalary legacy).
2. **Yêu cầu chi trả (happy)**: batch hiện tại `OPEN` và `netPayable >= 50000` → nút enable →
   `Modal.confirm` nêu số tiền sẽ chuyển sang chờ duyệt → POST `request-payout` → onSuccess
   `message.success` + batch chuyển `PENDING` (nút disable, Tag đổi màu).
3. **Yêu cầu chi trả (thiếu số dư)**: `netPayable < 50000` → BE trả 400
   `PAYROLL_BALANCE_NOT_ENOUGH` → `handleAdminMutationError` hiện message tiếng Việt "số dư
   chưa đạt tối thiểu 50.000đ"; state không đổi. (FE cũng disable nút sẵn khi <50000 để chặn
   sớm, nhưng vẫn phải xử lý lỗi BE phòng lệch.)
4. **Mở khoá ngoài scope**: sửa URL `/instructor/courses/:otherId` → `ScopeGuard` chặn →
   `/403`, không request dữ liệu khoá đó.

## 6. UX states

- Loading: `Card loading` cho thẻ batch, `Skeleton`/`Table loading` cho bảng (mirror
  `CtvKpiPage`/`CourseListPage`).
- Empty: không COURSE scope → empty state ở home (mirror `/ctv`); chưa có dòng lương →
  `Empty` "Chưa có kỳ lương nào".
- Error: envelope lỗi → `Typography.Text type="danger"` / `Alert`.
- Confirm-on-destructive: "Yêu cầu chi trả" là hành động chuyển trạng thái không tự huỷ →
  `Modal.confirm` nêu hệ quả (OPEN → PENDING, chờ super-admin duyệt) trước khi gọi.
- i18n: tiếng Việt inline theo file xung quanh; tiền tệ `Intl.NumberFormat('vi-VN', VND)`.

## 7. errors.ts — thêm mã

Thêm vào `ADMIN_ERROR_MESSAGES` (`src/shared/api/errors.ts`):
```
PAYROLL_BALANCE_NOT_ENOUGH: "Số dư thực nhận chưa đạt mức tối thiểu 50.000đ để yêu cầu chi trả.",
```
