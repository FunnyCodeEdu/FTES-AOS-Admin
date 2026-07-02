# Design — admin-foundation

## 1. Route & màn hình

| Route | Màn hình | Layout | Thành phần chính |
|---|---|---|---|
| `/login` | LoginPage | AuthLayout (không sidebar) | Form email/password + checkbox "Ghi nhớ đăng nhập"; step 2: form nhập mã TOTP 6 số (hiện khi BE trả `twoFactorRequired`) |
| `/` | DashboardPage | AdminLayout | Lưới widget theo tầng quyền (`WidgetGrid` render từ danh sách widget BE trả) |
| `/403` | ForbiddenPage | AdminLayout | Icon + thông điệp + **danh sách permission thiếu** (đọc từ router state) + nút "Về trang chủ" |
| `/404` | NotFoundPage | AdminLayout | Empty state + nút về trang chủ |
| `/*` (console về sau) | — | AdminLayout | Khung route lazy đăng ký qua `routeRegistry` kèm `requiredPermissions` |

**AdminLayout** (`src/app/layout/AdminLayout.tsx`): AntD `Layout` — `Sider` (nav sinh động,
collapse được, trạng thái collapse persist localStorage) + `Header` (breadcrumb, nút toggle
dark mode, chuông notification, dropdown user: tên/tầng quyền, Đăng xuất) + `Content`.

**Dark mode**: AntD v5 `ConfigProvider theme={{ algorithm: darkAlgorithm | defaultAlgorithm }}`,
lưu lựa chọn vào `uiStore` (persist localStorage key `ftes-admin-ui`), mặc định theo
`prefers-color-scheme`.

**Notification center**: chuông ở header hiện badge số chưa đọc; click mở `Drawer` danh sách
(phân trang cursor); notification mới đến (polling 30s) hiện `notification` toast AntD.
Task async (import, broadcast, export…) hiện mục riêng trong drawer với progress; hoàn thành
→ toast success/error.

## 2. Permission gates

- Nguồn permission: `GET /auth/me` trả `permissions: string[]` (leaf, vd `user.lock`,
  `resource.approve`) + `scopedGrants: {permission, scopeType, scopeId, expiresAt}[]`.
  Lưu vào `authStore`; helper `hasPermission(perm)`, `hasAnyPermission(perms)`,
  `hasScopedPermission(perm, scopeType, scopeId)`.
- **Nav**: mỗi nav item khai báo `requiredPermissions` (any-of). Item không thoả → KHÔNG render.
  Group hết item → ẩn group. KHÔNG có so sánh role string ở bất kỳ đâu trong FE.
- **Route guard** (`<PermissionRoute requiredPermissions={...}>`):
  - Chưa đăng nhập (không có session) → redirect `/login?returnUrl=<path hiện tại>`.
  - Đã đăng nhập nhưng thiếu permission → redirect `/403` kèm state
    `{missingPermissions: string[], from: path}` để ForbiddenPage nêu rõ permission thiếu.
- **Action gate**: component `<Can permissions={[...]} scope?={...}>` ẩn/disable nút.
- **CTV**: nav chỉ hiện các entry mà CTV có permission (thực tế là nhóm `/ctv/*` từ change
  `admin-ctv-program`); scoped grant hết hạn (`expiresAt` quá khứ) coi như không có.
- Dashboard widget: mỗi widget từ BE kèm `requiredPermissions`; FE chỉ render + fetch data
  widget mà user đủ quyền (phòng hờ — BE đã lọc sẵn theo user).

## 3. API contract tiêu thụ

Base `/api/v1/admin`, envelope `{code, message, data|null}` (`code === 0` là thành công —
**assumption**: quy ước code success, BE `admin-api` cần chốt). Các endpoint auth là
**assumption** theo change `identity-rbac`/`admin-api` bên FTES-AOS-Backend, chưa chốt path chính xác:

| Method | Path | Quyền | Request → Response `data` |
|---|---|---|---|
| POST | `/auth/login` | public | `{email, password, remember}` → `{twoFactorRequired: boolean, twoFactorToken?: string, accessToken?: string, refreshToken?: string, expiresIn?: number}` **(assumption)** |
| POST | `/auth/2fa/verify` | public | `{twoFactorToken, otp}` → `{accessToken, refreshToken, expiresIn}` **(assumption)** |
| POST | `/auth/refresh` | refresh token | `{refreshToken}` → `{accessToken, refreshToken, expiresIn}` **(assumption)** |
| POST | `/auth/logout` | bearer | `{refreshToken}` → `null` **(assumption)** |
| GET | `/auth/me` | bearer | → `{user: {id, email, fullName, avatarUrl}, permissions: string[], scopedGrants: [{permission, scopeType: 'GROUP'\|'SUBJECT'\|'RESOURCE_SET', scopeId, expiresAt}]}` |
| GET | `/dashboard/widgets` | bearer | → `{widgets: [{key, title, type: 'stat'\|'chart'\|'list', requiredPermissions: string[], dataEndpoint: string}]}` **(assumption — BE trả danh sách widget đã lọc theo quyền user)** |
| GET | `/notifications?cursor=&limit=` | bearer | → `{items: [{id, type, title, body, readAt, createdAt}], nextCursor, unreadCount}` **(assumption)** |
| POST | `/notifications/:id/read` · `/notifications/read-all` | bearer | → `null` **(assumption)** |
| GET | `/tasks?status=running` | bearer | → `{items: [{id, kind, label, progress, status, resultUrl?}]}` **(assumption — task async)** |

Lỗi: 401 (token hết hạn) → client tự refresh; 403 → body kèm
`data: {missingPermissions: string[]}` **(assumption)**; code != 0 với HTTP 200 → reject với
`ApiError{code, message}`.

## 4. State & data

**Zustand**
- `authStore` (persist một phần): `accessToken` (chỉ memory), `refreshToken` (localStorage nếu
  remember, ngược lại sessionStorage), `user`, `permissions: Set<string>`, `scopedGrants`,
  actions `setSession/clearSession`.
- `uiStore` (persist localStorage): `theme: 'light'|'dark'`, `sidebarCollapsed`.

**TanStack Query keys**
- `['auth','me']` — sau login/refresh trang; invalidate khi quyền đổi (BE đẩy noti `PERMISSION_CHANGED` → refetch, nav re-render).
- `['dashboard','widgets']` — staleTime 5 phút.
- `['dashboard','widget', widgetKey]` — data từng widget theo `dataEndpoint`.
- `['notifications','list']` — `useInfiniteQuery` cursor; `['notifications','unread-count']` refetchInterval 30s.
- `['tasks','running']` — refetchInterval 5s khi có task chạy, dừng khi rỗng.

Mutation đọc noti → invalidate `['notifications', ...]`.

## 5. Luồng nghiệp vụ chính

**Flow 1 — Login (kèm 2FA):**
1. Submit email/password → `POST /auth/login`.
2. Sai thông tin (code != 0) → hiện lỗi inline dưới form, không toast.
3. `twoFactorRequired: true` → chuyển step nhập TOTP, giữ `twoFactorToken` trong state form.
4. `POST /auth/2fa/verify`; OTP sai → lỗi inline, cho nhập lại; `twoFactorToken` hết hạn
   (code riêng) → quay lại step 1 kèm thông báo.
5. Có token → `authStore.setSession` (remember quyết định storage) → fetch `['auth','me']`
   → redirect `returnUrl` hợp lệ (chỉ path nội bộ) hoặc `/`.

**Flow 2 — Auto refresh (single-flight):**
1. Response 401 ở request bất kỳ (trừ `/auth/*`) → interceptor giữ request vào queue.
2. Nếu chưa có refresh đang chạy → gọi `POST /auth/refresh` (một lần duy nhất cho mọi request đợi).
3. Thành công → cập nhật token, phát lại toàn bộ queue.
4. Thất bại → `clearSession`, reject queue, redirect `/login?returnUrl=` + toast "Phiên hết hạn".

**Flow 3 — Điều hướng theo permission:**
1. Vào URL bất kỳ: guard kiểm tra session → chưa có: `/login?returnUrl=`.
2. Có session nhưng `['auth','me']` chưa load → hiện full-page skeleton (không nháy nav).
3. Đủ permission → render; thiếu → `/403` hiển thị đúng danh sách permission thiếu + đường dẫn bị chặn.
4. CTV gõ thẳng URL console admin (vd `/users`) → thiếu permission → `/403` (nav chưa từng hiện mục đó).

**Flow 4 — Dashboard theo tầng:**
1. Load `['dashboard','widgets']` → BE trả widget đã lọc theo quyền.
2. FE lọc thêm bằng `requiredPermissions` (defense-in-depth) → render grid, mỗi widget tự fetch `dataEndpoint`.
3. Widget lỗi → error state riêng widget đó (nút thử lại), không sập cả dashboard.
4. Danh sách rỗng (tài khoản chưa được cấp quyền nào) → empty state "Bạn chưa được cấp quyền xem thống kê".

## 6. UX states

- **Loading**: skeleton mirror layout — login button loading; dashboard: grid skeleton đúng số ô;
  drawer noti: 3 dòng skeleton; full-page: skeleton sidebar + header khi chờ `/auth/me`.
- **Empty**: dashboard không widget, noti trống ("Không có thông báo"), đều dùng `Empty` AntD + hướng dẫn.
- **Error**: lỗi mạng/5xx → `Result status="error"` + nút thử lại (refetch); lỗi form → inline.
- **Confirm-on-destructive**: change này không có mutation phá huỷ; logout không cần confirm
  nhưng nếu còn task async đang chạy → `Modal.confirm` cảnh báo task sẽ tiếp tục ở server.
- Dark mode: mọi màn kiểm tra cả 2 theme (AntD token, không hardcode màu).
