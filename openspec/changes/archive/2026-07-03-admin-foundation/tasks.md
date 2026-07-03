# Tasks — admin-foundation

## 1. Khung project & providers
- [x] 1.1 Scaffold Vite + React 18 + TS; cài antd v5, react-router-dom, @tanstack/react-query, zustand, axios
- [x] 1.2 `src/app/providers.tsx`: QueryClientProvider + ConfigProvider (theme algorithm theo `uiStore`) + AntD App context
- [x] 1.3 `src/app/router.tsx`: createBrowserRouter + `routeRegistry` (route khai báo kèm `requiredPermissions`)

## 2. API client (`src/shared/api/`)
- [x] 2.1 `client.ts`: axios instance base `/api/v1/admin`, unwrap envelope `{code,message,data}`, `ApiError`
- [x] 2.2 Interceptor request: gắn Bearer từ `authStore`
- [x] 2.3 Interceptor 401: single-flight refresh + queue phát lại; refresh fail → clearSession + redirect `/login`
- [x] 2.4 Xử lý 403: ném `ForbiddenError{missingPermissions}`; lỗi mạng/5xx chuẩn hoá message

## 3. Auth (`src/features/auth/`)
- [x] 3.1 `authStore` (zustand): token (memory/storage theo remember), user, permissions Set, scopedGrants
- [x] 3.2 LoginPage 2 step: credentials → TOTP; lỗi inline; remember checkbox
- [x] 3.3 API hooks: login, verify2fa, refresh, logout, `useMe` (`['auth','me']`)
- [x] 3.4 Logout: gọi BE, clearSession, redirect; confirm nếu còn task async đang chạy

## 4. Permission-driven nav & guard (`src/shared/permissions/`)
- [x] 4.1 Helpers `hasPermission/hasAnyPermission/hasScopedPermission` (check `expiresAt`)
- [x] 4.2 `<PermissionRoute>`: chưa login → `/login?returnUrl=`; thiếu quyền → `/403` kèm state missingPermissions. Không dùng `navigate()` trong render; lỗi 500/network hiện error state + retry, chỉ đá về login khi 401.
- [x] 4.3 Nav builder: sinh menu Sider từ `routeRegistry` × permissions user; ẩn item/group không đủ quyền. Một nguồn permission duy nhất là `useMe()`.
- [x] 4.4 `<Can>` component gate nút hành động; ForbiddenPage `/403` nêu permission thiếu; NotFoundPage `/404`

## 5. App shell (`src/app/layout/`)
- [x] 5.1 AdminLayout: Sider collapse (persist) + Header (breadcrumb, dark mode toggle, chuông noti, user menu) + Content
- [x] 5.2 Dark mode: `uiStore` persist + ConfigProvider algorithm, default theo prefers-color-scheme
- [x] 5.3 Notification center: Drawer list (useInfiniteQuery cursor), badge unread (poll 30s), toast noti mới. Khi nhận notification loại `PERMISSION_CHANGED`, invalidate `['auth','me']` để nav/route re-render mà không cần re-login.
- [x] 5.4 Async task: mục task trong drawer với progress (poll 5s khi có task), toast khi xong

## 6. Dashboard (`src/features/dashboard/`)
- [x] 6.1 `useWidgets` (`['dashboard','widgets']`) + lọc client theo `requiredPermissions`
- [x] 6.2 WidgetGrid + widget renderer theo `type` (stat/chart/list), mỗi widget tự fetch `dataEndpoint`
- [x] 6.3 UX states: skeleton mirror grid, empty "chưa được cấp quyền", error per-widget có retry

## 7. Verify
- [x] 7.1 npm run build xanh + tsc --noEmit sạch
- [x] 7.2 Smoke test tay: `npm run preview` khởi động và phục vụ HTML; build/typecheck sạch; F5 remember-me test bằng Playwright + mock backend xác nhận cả sidebar VÀ dashboard widget đều render sau restore session.
