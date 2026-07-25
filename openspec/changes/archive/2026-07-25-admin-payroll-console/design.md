# Design — admin-payroll-console

Port màn legacy `FunnyCodeEdu-frontend-admin/src/pages/Salary` (list + stat + sửa
phụ cấp/chi phí + đổi trạng thái) sang admin v2: AntD 5, server-table pattern như
`src/features/academic/courses/pages/CourseListPage.tsx`, gate theo permission leaf.

## 1. Route & màn hình

Thêm vào `src/app/routeRegistry.tsx`:

| Path | Element | layout | gate | nav |
|---|---|---|---|---|
| `/payroll` | `PayrollListPage` | admin | `requiredPermissions: ["payroll.read"]` | `{ label: "Lương", icon: <DollarOutlined />, group: "Nhân sự" }` |
| `/payroll/:id` | `PayrollDetailPage` | admin | `requiredPermissions: ["payroll.read"]` | — |

- **PayrollListPage**: 
  - 4 stat card (mirror legacy `Statistic`): Tổng quỹ (`sum(grossRevenue+allowance)`),
    Đã trả (`sum(netPayable)` các dòng `status==="CLOSE"`), Đang chờ (`sum(netPayable)` các
    dòng `PENDING`), Số giảng viên (số dòng). Tính từ danh sách đã tải.
  - Toolbar: `Input` tìm theo `instructorName`; `Select` filter status (OPEN/PENDING/CLOSE).
  - `Table` cột: STT, Giảng viên (`instructorName`, sorter), Doanh thu gộp (`grossRevenue`,
    VND), Phụ cấp (`allowance`), Tổng trừ (`totalDeduction`), Thực nhận (`netPayable`), Ngày
    tạo (`createdAt`), Trạng thái (`status` → `Tag` màu: OPEN=processing, PENDING=warning,
    CLOSE=success), Hiệu lực (`active`), Thao tác.
  - Thao tác/dòng: nút "Chi tiết" → `/payroll/:id`; bọc `<Can permissions={["payroll.manage"]}>`
    quanh `Select` đổi trạng thái (mark-paid).
- **PayrollDetailPage** (trang hoặc `Drawer` mở từ list):
  - Mô tả batch (`Descriptions`): giảng viên, gross, phụ cấp, tổng trừ, thực nhận, trạng
    thái, ngày tạo, ngày trả.
  - **Sửa phụ cấp**: `InputNumber` + nút "Cập nhật phụ cấp" → `PUT .../{id}/allowance`
    `{allowance}`; disable khi `status !== "OPEN"` (mirror legacy chặn khi PENDING).
    Bọc `<Can permissions={["payroll.manage"]}>`.
  - **Bảng khoản trừ** (`deductions[]`): cột Loại (`type`), Mô tả (`description`), Số tiền
    (`amount`, VND), Thao tác. Nút "Thêm khoản trừ" → modal `{type, amount, description}` →
    `POST .../{id}/deductions`; sửa → `PUT .../deductions/{id}`; xoá →
    `DELETE .../deductions/{id}` (`Popconfirm okType="danger"`). Tất cả gate `payroll.manage`
    + disable khi `status !== "OPEN"`.
  - **Đổi trạng thái**: `POST .../{id}/status` `{status}`; luồng chính PENDING → CLOSE
    (mark-paid) qua `Modal.confirm okType="danger"` nêu hệ quả (ghi nhận đã chi trả, không
    hoàn tác). Gate `payroll.manage`.

## 2. Permission gates

- Route `/payroll`, `/payroll/:id`: `requiredPermissions: ["payroll.read"]` → thiếu quyền =
  `/403` nêu permission thiếu (`PermissionRoute`). Nav "Lương" chỉ hiện khi có `payroll.read`
  (NavMenu tự lọc theo permission).
- Mọi mutation (sửa phụ cấp, thêm/sửa/xoá khoản trừ, đổi trạng thái): bọc
  `<Can permissions={["payroll.manage"]}>` — người chỉ có `payroll.read` thấy dữ liệu nhưng
  KHÔNG thấy nút sửa/xoá/đổi trạng thái trong DOM.
- **KHÔNG role gating** (`role === "ADMIN"`) — chỉ permission leaf; đây là điểm sửa so với
  admin legacy.

## 3. API contract tiêu thụ (`coreClient` = `/api/v1`, envelope `{code,message,data}`)

> Client `src/features/payroll/api/payroll.api.ts` dùng **`coreClient`** (KHÔNG `apiClient`).

| Method | Path | Quyền | Request | Response `data` |
|---|---|---|---|---|
| GET | `/payroll/admin/earnings` | payroll.read | (params filter/search nếu BE hỗ trợ) | `Earning[]` (mỗi giảng viên lazily có 1 batch OPEN) |
| GET | `/payroll/admin/earnings/{id}` | payroll.read | — | `Earning` |
| PUT | `/payroll/admin/earnings/{id}/allowance` | payroll.manage | `{ allowance: number }` | `Earning` |
| POST | `/payroll/admin/earnings/{id}/deductions` | payroll.manage | `{ type, amount, description }` | `Earning` \| `PayrollDeduction` |
| PUT | `/payroll/admin/earnings/deductions/{id}` | payroll.manage | `{ type?, amount?, description? }` | `PayrollDeduction` |
| DELETE | `/payroll/admin/earnings/deductions/{id}` | payroll.manage | — | `void` |
| POST | `/payroll/admin/earnings/{id}/status` | payroll.manage | `{ status: "OPEN"\|"PENDING"\|"CLOSE" }` | `Earning` |
| GET | `/payroll/admin/config` | payroll.read | — | `PayrollConfig` (vd `{ minPayout, currency, ... }`) |

`Earning` / `PayrollDeduction` — **assumption về tên field** (theo mô tả BE đã ship; xác
nhận tại `FTES-AOS-Backend/src/main/java/vn/ftes/aos/payroll/web/` nếu mã BE có sẵn):

```ts
interface PayrollDeduction { id: string; type: string; amount: number; description?: string }
interface Earning {
  id: string; instructorId: string; instructorName: string;
  grossRevenue: number; allowance: number; totalDeduction: number; netPayable: number;
  status: "OPEN" | "PENDING" | "CLOSE"; deductions: PayrollDeduction[];
  createdAt: string; paidAt: string | null; active: boolean;
}
```

- Lỗi trạng thái không hợp lệ (vd đổi status sai luồng) → BE trả `errorCode`
  `PAYROLL_INVALID_STATUS` (**assumption**) → map message tiếng Việt trong `errors.ts` (§7).

## 4. State & data

- Query-key factory `src/features/payroll/api/payroll.keys.ts`:
  ```ts
  export const payrollKeys = {
    all: ["admin", "payroll"] as const,
    lists: () => [...payrollKeys.all, "list"] as const,
    list: (params: PayrollListParams) => [...payrollKeys.lists(), params] as const,
    details: () => [...payrollKeys.all, "detail"] as const,
    detail: (id: string | undefined) => id ? [...payrollKeys.details(), id] as const : payrollKeys.details(),
    config: () => [...payrollKeys.all, "config"] as const,
  };
  ```
- `usePayrollList(params)` — `useQuery` `keepPreviousData` (mirror `CourseListPage`);
  `usePayrollDetail(id)`; `usePayrollConfig()`.
- Mutations: `useUpdateAllowance`, `useAddDeduction`, `useUpdateDeduction`,
  `useDeleteDeduction`, `useUpdateStatus` — onSuccess invalidate `payrollKeys.detail(id)` +
  `payrollKeys.lists()`; lỗi qua `handleAdminMutationError`.
- Search/filter đồng bộ `useSearchParams` ↔ query params (search `q`, `status`); nếu BE
  chưa nhận filter thì lọc client-side như legacy (đánh dấu assumption).

## 5. Luồng nghiệp vụ chính

1. **Mở list + đọc stat**: `/payroll` → `usePayrollList` → 4 stat card + bảng. Người chỉ có
   `payroll.read` thấy bảng, không thấy nút quản lý.
2. **Sửa phụ cấp**: mở chi tiết (batch OPEN) → nhập allowance → "Cập nhật" → `PUT allowance`
   → onSuccess `netPayable`/`totalDeduction` tính lại (BE trả Earning mới) → invalidate.
   Batch không OPEN → input disable.
3. **Thêm/xoá khoản trừ**: "Thêm khoản trừ" → modal `{type,amount,description}` → `POST
   deductions` → bảng cập nhật. Xoá → `Popconfirm okType="danger"` → `DELETE deductions/{id}`.
   Gate `payroll.manage` + chỉ khi OPEN.
4. **Mark-paid (PENDING → CLOSE)**: dòng/chi tiết PENDING → chọn CLOSE → `Modal.confirm
   okType="danger"` nêu "ghi nhận đã chi trả, không hoàn tác" → `POST status {status:"CLOSE"}`
   → status CLOSE + `paidAt` set. Luồng sai (vd CLOSE→OPEN) BE từ chối → message lỗi.
5. **Thiếu quyền manage**: người có `payroll.read` không có `payroll.manage` — nút không
   render; nếu vẫn gọi API bị BE trả 403 → `ForbiddenError` → message "không có quyền".

## 6. UX states

- Loading: `Skeleton`/`Table loading` cho bảng, `Card loading` cho stat (mirror
  `CourseListPage`).
- Empty: không có dòng lương → `Empty` "Chưa có dữ liệu lương".
- Error: `Alert`/`message.error` từ `adminErrorMessage`.
- Confirm-on-destructive: đổi trạng thái CLOSE + xoá deduction → `Modal.confirm`/`Popconfirm`
  `okType="danger"` nêu hệ quả (mark-paid không hoàn tác); reason nếu BE yêu cầu
  (`ADMIN_REASON_REQUIRED` đã có trong `errors.ts`).
- Tiền tệ `Intl.NumberFormat('vi-VN', VND)`; ngày `toLocaleDateString('vi-VN')`.

## 7. errors.ts — thêm mã

Thêm vào `ADMIN_ERROR_MESSAGES` (`src/shared/api/errors.ts`):
```
PAYROLL_BALANCE_NOT_ENOUGH: "Số dư thực nhận chưa đạt mức tối thiểu để chi trả.",
PAYROLL_INVALID_STATUS: "Chuyển trạng thái lương không hợp lệ theo luồng OPEN → PENDING → CLOSE.",
PAYROLL_NOT_FOUND: "Không tìm thấy bản ghi lương tương ứng.",
PAYROLL_LOCKED: "Kỳ lương đã chốt (CLOSE) — không thể chỉnh sửa.",
```
