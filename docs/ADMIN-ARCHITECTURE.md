# FTES-AOS-Admin — Mô hình quản trị đa tầng

> Nguồn chân lý cho mọi spec/change của repo này. RBAC data model sống ở backend
> (change `identity-rbac` + `admin-api` bên FTES-AOS-Backend); tài liệu này định nghĩa
> cách admin FE tiêu thụ nó.

## 1. Bốn tầng quyền

```
SUPER_ADMIN ─ toàn hệ thống (config, RBAC, feature flag, audit, mọi console)
  └─ ADMIN theo mảng — mỗi admin gán 1+ "mảng" (domain area):
       admin-users      → Users console (tài khoản, khoá, bảo mật)
       admin-academic   → Academic console (course, subject, resource, học liệu)
       admin-commerce   → Commerce console (order, payment, wallet, coupon, marketplace)
       admin-community  → Community console (posts, groups, events)
       admin-operations → Operations console (notification broadcast, banner, event vận hành)
  └─ MODERATOR — kiểm duyệt: report queue, content workflow (duyệt/từ chối), moderation log
  └─ CTV (cộng tác viên) — scoped grant: chỉ thao tác trong scope được gán
       (group cụ thể / bộ học liệu cụ thể / subject cụ thể), quyền là SUBSET do
       admin mảng cấp (vd ctv-group: quản members+posts của đúng group đó;
       ctv-resource: upload/sửa học liệu của đúng subject đó, KHÔNG được approve)
```

## 2. Nguyên tắc permission-driven (BẮT BUỘC)

- FE lấy từ BE sau đăng nhập: danh sách **permission leaf** (vd `course.publish`,
  `resource.approve`, `user.lock`) + **scoped grants** (`{permission, scopeType, scopeId}`).
- Nav, route guard, nút hành động đều gate theo permission — KHÔNG so sánh role string.
  Role chỉ là preset của tập permission, do BE quản.
- CTV: mọi query tự động filter theo scope (BE enforce, FE chỉ hiển thị đúng scope trong
  UI — picker scope khi user có nhiều scope).
- Hành động nguy hiểm (đổi quyền, khoá, xoá, refund, publish): confirm dialog nêu hệ quả
  + hiển thị vào audit log.

## 3. Conventions FE

- Stack: Vite + React 18 + TS + Ant Design 5 + React Router + TanStack Query + Zustand.
- API: `/api/v1/admin/...` (FTES-AOS-Backend), envelope `{code, message, data|null}`,
  auth Bearer JWT + refresh; 401 → re-login, 403 → trang Forbidden kèm permission thiếu.
- Route map: `/login`, `/` (dashboard theo tầng), `/users/*`, `/academic/*`, `/commerce/*`,
  `/community/*`, `/operations/*`, `/moderation/*`, `/ctv/*` (workspace CTV),
  `/system/*` (Super Admin: rbac, config, flags, audit).
- Mỗi console = 1 feature folder `src/features/<console>/` (pages + api + components).
- Bảng dữ liệu: server-side pagination/sort/filter; mọi list có search + empty/loading/error state.
- i18n: vi mặc định, chuẩn bị khung en.

## 4. Danh sách change (openspec/changes/)

| Change | Nội dung |
|---|---|
| `admin-foundation` | App shell, login (JWT + 2FA), permission-driven nav/guard, API client |
| `admin-rbac-management` | Console Super Admin: role/permission/scoped grant, gán admin mảng |
| `admin-ctv-program` | Tuyển & vận hành CTV: invite, onboarding, workspace scoped, KPI đóng góp, thu hồi |
| `admin-user-console` | Quản user: search/detail/lock/reset/role, security log |
| `admin-academic-console` | Course/Subject/Resource/học liệu + approval workflow |
| `admin-community-console` | Posts/Groups/Comments + report handling |
| `admin-commerce-console` | Order/Payment/Wallet/Coupon/Marketplace, refund flow |
| `admin-operations-console` | Notification broadcast, banner/announcement, event vận hành, feature toggle |
| `admin-analytics-audit` | Dashboard analytics theo tầng + audit log viewer |
