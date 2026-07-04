# Design — admin-user-console

## 1. Route & màn hình

| Route | Page component | Layout | Nội dung chính |
|---|---|---|---|
| `/users` | `UserListPage` | AdminShell (sidebar + header) | Bảng user server-side, thanh search, filter role/status/campus, nút Export |
| `/users/:id` | `UserDetailPage` | AdminShell | Header hồ sơ (avatar, tên, email, status badge, role tags) + hàng nút hành động + Tabs |
| `/users/:id/impersonate` | `ImpersonateViewerPage` | Fullscreen viewer, banner cam "Đang xem dưới danh nghĩa {user} — chế độ chỉ đọc" | Iframe/embedded view app học viên ở chế độ read-only, nút "Thoát impersonate" |

Tabs trong `UserDetailPage`:

| Tab | Component | Nội dung |
|---|---|---|
| Hồ sơ | `ProfileTab` | Thông tin cá nhân, campus, ngày tạo, trạng thái, lý do khoá gần nhất |
| Học tập | `LearningTab` | Tóm tắt: courses enrolled, tiến độ, chứng chỉ; bảng enrollment server-side |
| Giao dịch | `TransactionsTab` | Tóm tắt: tổng chi, số order, số dư ví; bảng 10 giao dịch gần nhất + link sang `/commerce/orders?userId=` |
| Thiết bị & Session | `SessionsTab` | Bảng session đang hoạt động (device, IP, last active), checkbox chọn, nút "Thu hồi" |
| Security log | `SecurityLogTab` | Timeline sự kiện bảo mật (login fail, đổi mật khẩu, khoá/mở, revoke) — server-side pagination + filter loại sự kiện + khoảng ngày |

Feature folder: `src/features/users/`
- `pages/UserListPage.tsx`, `pages/UserDetailPage.tsx`, `pages/ImpersonateViewerPage.tsx`
- `api/users.api.ts` (hàm gọi API + types), `api/users.keys.ts` (query keys)
- `components/` (UserTable, UserFilters, LockUserModal, ResetPasswordModal,
  RevokeSessionsModal, ChangeRoleModal, ExportButton, tab components)

## 2. Permission gates

| Permission leaf | Gate cái gì | Khi thiếu quyền |
|---|---|---|
| `user.view` | Nav item "Người dùng", route `/users/*` | Ẩn nav; truy cập trực tiếp URL → trang 403 Forbidden kèm tên permission thiếu |
| `user.export` | Nút "Export" trên `/users` | Nút ẩn |
| `user.lock` | Nút "Khoá tài khoản" / "Mở khoá" | Nút ẩn |
| `user.reset_password` | Nút "Force reset mật khẩu" | Nút ẩn |
| `user.session_revoke` | Nút "Thu hồi session" (tab Sessions) | Nút ẩn, bảng session vẫn xem được |
| `rbac.role.assign` | Nút "Đổi role" + `ChangeRoleModal` | Nút ẩn hoàn toàn (theo yêu cầu: không disable, ẩn) |
| `user.impersonate` | Nút "Xem như user" + route `/users/:id/impersonate` | Nút ẩn; URL trực tiếp → 403. BE chỉ cấp permission này cho Super Admin |

- Tất cả gate dùng hook `usePermission(leaf)` từ `admin-foundation` — KHÔNG so sánh role string.
- CTV không có `user.view` trong mọi preset → console này không xuất hiện với CTV.
- Mọi response 403 từ BE (kể cả khi FE đã ẩn nút — phòng race quyền bị thu hồi giữa phiên)
  → toast lỗi "Bạn không còn quyền thực hiện thao tác này" + invalidate query permission.

## 3. API contract tiêu thụ

Envelope chung `{code, message, data|null}`. Base: `/api/v1/admin`. Tất cả endpoint dưới đây
là **assumption** theo change `admin-api` bên FTES-AOS-Backend (BE chưa chốt spec chi tiết);
tên field có thể đổi khi BE finalize — FE cô lập mapping trong `users.api.ts`.

| Method | Path | Quyền | Request chính | Response `data` chính |
|---|---|---|---|---|
| GET | `/users` | `user.view` | query: `search, role, status, campus, page, pageSize, sortBy, sortOrder` | `{items: UserRow[], total, page, pageSize}` |
| GET | `/users/:id` | `user.view` | — | `UserProfile` (kèm `status`, `lockReason`, `roles[]`, `campus`) |
| GET | `/users/:id/learning-summary` | `user.view` | — | `{enrolledCount, completedCount, certificates, enrollments: page}` |
| GET | `/users/:id/transactions-summary` | `user.view` | — | `{totalSpent, orderCount, walletBalance, recentTransactions[]}` |
| GET | `/users/:id/sessions` | `user.view` | — | `{items: Session[] (device, ip, lastActiveAt, current)}` |
| GET | `/users/:id/security-log` | `user.view` | query: `eventType, from, to, page, pageSize` | `{items: SecurityEvent[], total}` |
| POST | `/users/:id/lock` | `user.lock` | `{reason: string}` (bắt buộc) | `UserProfile` mới |
| POST | `/users/:id/unlock` | `user.lock` | `{reason: string}` (bắt buộc) | `UserProfile` mới |
| POST | `/users/:id/force-reset-password` | `user.reset_password` | `{notifyUser: boolean}` | `{resetIssuedAt}` — BE vô hiệu mật khẩu cũ + gửi mail reset |
| POST | `/users/:id/sessions/revoke` | `user.session_revoke` | `{sessionIds: string[] \| "all"}` | `{revokedCount}` |
| PUT | `/users/:id/roles` | `rbac.role.assign` | `{roleIds: string[], reason: string}` | `UserProfile` mới |
| POST | `/users/:id/impersonate` | `user.impersonate` | — | `{impersonationToken, expiresAt}` — token scope read-only do BE enforce |
| POST | `/users/export` | `user.export` | body = filter hiện tại của list | `{jobId}` → poll `GET /users/export/:jobId` trả `{status, downloadUrl}` |

## 4. State & data

TanStack Query keys (đặt tại `users.keys.ts`):

- `['admin','users','list', params]` — list, `keepPreviousData` khi đổi trang.
- `['admin','users','detail', id]`
- `['admin','users','detail', id, 'learning']`
- `['admin','users','detail', id, 'transactions']`
- `['admin','users','detail', id, 'sessions']`
- `['admin','users','detail', id, 'security-log', params]`
- `['admin','users','export', jobId]` — `refetchInterval: 2000` tới khi `status !== 'processing'`.

Invalidation:
- lock/unlock/đổi role → invalidate `['admin','users','detail', id]` + `['admin','users','list']`.
- revoke sessions → invalidate `...['sessions']` + `...['security-log']`.
- force reset → invalidate `...['security-log']`.

Zustand: store `impersonationStore` — `{active, targetUser, token, exit()}`; banner
impersonate render theo store; token KHÔNG ghi đè token admin trong `authStore`
(giữ ở memory, chỉ dùng cho viewer).

## 5. Luồng nghiệp vụ chính

### Flow A — Khoá tài khoản
1. Admin có `user.lock` bấm "Khoá tài khoản" ở `/users/:id`.
2. `LockUserModal` mở: textarea lý do (bắt buộc, ≥10 ký tự), cảnh báo hệ quả
   ("User bị đăng xuất mọi thiết bị, không đăng nhập được cho tới khi mở khoá").
3. Confirm → `POST /users/:id/lock`. Nút loading, modal khoá tương tác.
4. Thành công → toast, status badge đổi "Đã khoá", lý do hiện ở tab Hồ sơ, BE ghi audit.
5. Lỗi: 403 → toast thiếu quyền + refresh permission; 409 (đã khoá bởi người khác) →
   toast + refetch detail; lỗi mạng → giữ modal, cho retry.

### Flow B — Đổi role
1. Chỉ khi caller có `rbac.role.assign` mới thấy nút "Đổi role".
2. `ChangeRoleModal`: multi-select role (load từ API RBAC của `admin-rbac-management`),
   diff hiển thị "thêm X / bỏ Y", lý do bắt buộc.
3. Confirm dialog thứ hai nêu hệ quả ("Quyền của user đổi ngay lập tức") → `PUT /users/:id/roles`.
4. Thành công → invalidate detail + list; BE ghi audit. 403 → như Flow A.

### Flow C — Impersonate read-only
1. Super Admin bấm "Xem như user" → confirm dialog nêu: phiên chỉ đọc, mọi thao tác
   ghi bị chặn, hành động được ghi audit.
2. `POST /users/:id/impersonate` → nhận token read-only → navigate `/users/:id/impersonate`.
3. Viewer render app học viên với token đó; banner cam cố định; mọi mutation từ viewer
   bị BE trả 403 (FE viewer cũng disable form).
4. "Thoát" hoặc token hết hạn → về `/users/:id`, store reset.

### Flow D — Export danh sách
1. Bấm "Export" → confirm hiển thị bộ filter đang áp dụng + số bản ghi ước tính.
2. `POST /users/export` → nhận `jobId` → hiện progress (poll). Xong → nút tải file.
3. Job lỗi → thông báo lỗi kèm retry. Rời trang không huỷ job (job list lại được qua poll key).

## 6. UX states

- **Loading**: list → skeleton bảng đúng số cột; detail → skeleton mirror layout
  (header block + tab bar + content block); tab lazy-load khi active.
- **Empty**: list không có kết quả → empty state "Không tìm thấy user" + nút xoá filter;
  security log trống → "Chưa có sự kiện bảo mật".
- **Error**: query lỗi → Alert kèm nút "Thử lại" (refetch); 403 route-level → trang Forbidden
  chung kèm permission thiếu.
- **Confirm-on-destructive**: lock/unlock, force reset, revoke sessions, đổi role,
  impersonate — tất cả có confirm nêu hệ quả; lock/unlock/đổi role bắt buộc nhập lý do.
