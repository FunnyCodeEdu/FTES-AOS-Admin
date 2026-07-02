# admin-foundation — Nền tảng admin CMS: shell, auth, permission-driven nav, API client, dashboard

## Why

Admin CMS v2 xây mới từ đầu, thay admin cũ 2-role. Theo `docs/ADMIN-ARCHITECTURE.md`, hệ có
4 tầng quyền (Super Admin / Admin theo mảng / Moderator / CTV scoped) và nguyên tắc BẮT BUỘC
là **permission-driven**: nav, route, nút hành động đều gate theo danh sách permission leaf +
scoped grants do BE trả về sau đăng nhập — không so sánh role string. Mọi console về sau
(`admin-user-console`, `admin-academic-console`, …) đều đứng trên nền này, nên phải có trước:
app shell, luồng đăng nhập (JWT + refresh + 2FA TOTP), route guard theo permission, API client
chuẩn envelope, notification center và dashboard trang chủ render theo tầng quyền.

## What Changes

- Dựng app shell Ant Design 5: layout sidebar + header, dark mode toggle (persist), sidebar
  collapse, notification center (toast + panel + theo dõi task async).
- Luồng đăng nhập: email/password → (2FA TOTP nếu tài khoản bật) → nhận access/refresh token;
  "remember me" quyết định nơi lưu refresh token; auto refresh; logout.
- Permission-driven navigation & routing: nav sinh động từ permission list BE trả sau login
  (KHÔNG hardcode role); route guard: chưa login → `/login` (kèm returnUrl), thiếu permission
  → trang 403 nêu rõ permission thiếu.
- API client (axios wrapper): envelope `{code, message, data|null}`, gắn Bearer token,
  single-flight refresh khi 401, xử lý 403, chuẩn hoá lỗi mạng/5xx.
- Dashboard trang chủ `/`: render widget theo tầng quyền (Super Admin thấy tổng hệ thống;
  admin mảng thấy widget mảng mình; CTV thấy stats trong scope).

## Capabilities

### New Capabilities
- `admin-app-shell`: layout sidebar+header, dark mode, notification center + async task toast.
- `admin-auth-session`: login JWT + refresh, 2FA TOTP khi bật, remember me, logout.
- `admin-permission-navigation`: nav sinh từ permission BE, route guard login/403 nêu permission thiếu.
- `admin-api-client`: wrapper envelope, auto refresh token, 401/403/lỗi mạng handling.
- `admin-dashboard-home`: dashboard trang chủ render widget theo tầng quyền.

### Modified Capabilities
Không sửa capability nào (change nền tảng đầu tiên của repo).

## Impact

- Route mới: `/login`, `/` (dashboard), `/403`, `/404`; khung route cho các console về sau.
- Feature folder: `src/features/auth/`, `src/features/dashboard/`, `src/features/notifications/`;
  dùng chung: `src/app/` (router, layout, providers), `src/shared/api/`, `src/shared/permissions/`.
- API BE tiêu thụ: `/api/v1/admin/auth/*`, `/api/v1/admin/auth/me`, `/api/v1/admin/dashboard/widgets`,
  `/api/v1/admin/notifications*` (một số endpoint là assumption — xem design.md).
- Permission gates: toàn bộ nav item/route khai báo `requiredPermissions`; dashboard widget
  khai báo permission của widget; không có permission → ẩn nav + 403 khi vào thẳng URL.
