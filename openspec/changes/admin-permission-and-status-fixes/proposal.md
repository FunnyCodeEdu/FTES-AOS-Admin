## Why

Test end-to-end trên apitest phát hiện 2 lỗi chặn cả admin: (1) **~40 route /403** — FE gate route/nav/nút bằng tên permission KHÔNG có trong catalog BE (vd `course.view`, `commerce.view`, `analytics.view.learning`, `operations.*.manage`...) trong khi ADMIN có `admin.<domain>.read`; (2) **crash runtime** ở trang mở được (`SubjectTable`, `UserTable`) do `Record<Status/Role,…>[status]` undefined khi BE trả status UPPERCASE (INACTIVE/PUBLISHED...) không có key.

## What Changes

- **Đổi tên permission ở mọi gate FE** sang leaf đúng của catalog BE (bảng mapping đầy đủ ở design):
  - Route/nav VIEW gate → `admin.<domain>.read` (ADMIN đã có → mở route ngay).
  - Nút ACTION → leaf BE API thực thi (leaf ADMIN có sẵn, hoặc `admin.*.manage` sẽ được cấp qua BE change `admin-role-content-manage-grants`; nếu là leaf ADMIN không nên có như `admin.rbac.manage` thì để nguyên → nút tự ẩn đúng).
  - `(D) NO_ADMIN_LEAF` (quiz.*, ctv.*, user.impersonate/export, analytics.export, commerce.refund.execute, event.certificate): tạm map về leaf gần nhất ADMIN có để mở trang; ghi chú cần seed leaf BE sau.
- **Chống crash status-map**: mọi `Record<Status/Role,{...}>` khi tra key phải có FALLBACK (không undefined) + hiển thị được status BE trả (UPPERCASE) — thêm default + normalize.

## Capabilities

### New Capabilities

- `admin-permission-alignment`: Gate route/nav/nút của admin dùng đúng leaf catalog BE → ADMIN mở được các trang tương ứng, nút hiện đúng theo quyền thật.
- `admin-status-badge-robustness`: Mọi bảng/badge trạng thái không crash khi gặp giá trị status/role ngoài map; hiển thị nhãn fallback.

## Impact

- **FE sửa**: `src/app/routeRegistry.tsx`, `src/shared/permissions/NavMenu.tsx`, và các gate `Can`/`hasAnyPermission` + status-map trong `src/features/**`.
- **Không đụng BE** (BE grant leaf ở change riêng). Route-view mở được NGAY (admin.*.read ADMIN đã có); action `admin.*.manage` chạy sau khi apitest deploy migration V161.
- Verify `tsc --noEmit` + `npm run build`, rồi test lại end-to-end.
