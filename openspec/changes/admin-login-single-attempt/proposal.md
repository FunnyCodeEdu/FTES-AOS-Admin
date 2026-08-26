# admin-login-single-attempt — đăng nhập MỘT lần là vào, và đăng nhập được bằng username

## Why

**(1) Phải bấm đăng nhập hai lần.** Đợt trước đã vá một nguyên nhân (`refetch()` của `useMe` là
no-op vì hook bị gác `enabled`), bản vá đã lên production nhưng người dùng vẫn phải đăng nhập lại
lần hai. Còn hai đường nữa dẫn tới đúng triệu chứng đó, cả hai đều nằm ở interceptor 401:

- `fetchSuperAdmin()` gọi `GET /identity/me/permissions` qua `coreClient` — SONG SONG với query `me`
  ngay sau khi đăng nhập. Nơi gọi đã bọc `try/catch`, nhưng try/catch chỉ nuốt được *giá trị lỗi*;
  tác dụng phụ của interceptor thì không: 401 + refresh trượt ⇒ `clearSession()` + `window.location
  .href = "/login"`. Một lời gọi nền chỉ để lấy CỜ TRANG TRÍ có toàn quyền thổi bay phiên vừa tạo.
- `redirectToLogin()` không xét mình đang ở đâu. Kích hoạt lúc người dùng đang đứng ở `/login` thì
  đó là một cú reload CỨNG, huỷ mọi request đang bay — kể cả chính `POST /auth/login` vừa bấm.

Thêm nữa, `useFinishSession` coi "không lấy được `me`" là đăng nhập thất bại và đứng lại ở form.
Nhưng token lúc đó đã hợp lệ: một cú chập mạng của `me` biến thành "đăng nhập không ăn", và lần bấm
thứ hai thành công chỉ vì lần hỏng kia là hỏng nhất thời — đúng hình dạng lỗi người dùng mô tả.

**(2) Không đăng nhập được bằng username.** Backend đã tra `findByUsernameOrEmailIgnoreCase` và DTO
chỉ `@NotBlank identifier` — username vốn dùng được. Chặn nằm ở form admin: field tên `email` với
rule `type: "email"`, nên tài khoản chỉ-có-username không có đường vào.

## What Changes

- **`client.ts`** — thêm cờ `bestEffortAuth` cho request phụ: 401 vẫn thử refresh, nhưng refresh
  trượt thì CHỈ reject, không `clearSession()`, không điều hướng. Thêm `_retried` chặn vòng lặp
  401 → refresh → 401. `redirectToLogin()` no-op khi đã ở `/login`.
- **`api.ts`** — `fetchSuperAdmin()` gắn `bestEffortAuth: true`; `LoginCredentials.email` →
  `identifier` (gửi thẳng cho BE, không đổi hợp đồng API).
- **`useFinishSession.ts`** — thử `me` hai lần; hỏng cả hai thì VẪN lập phiên và điều hướng (báo
  toast "đang tải lại thông tin"). An toàn vì `PermissionRoute`/`NavMenu`/`Can`/`AdminLayout` đều
  đọc quyền từ `useMe()` chứ không từ store — phiên thiếu `me` không hề nới quyền.
- **`LoginPage.tsx`** — ô đăng nhập thành "Email hoặc tên đăng nhập" (`name="identifier"`), bỏ rule
  `type: "email"`.

## Impact

Admin-only (FE). Sửa `shared/api/client.ts`, `features/auth/{api,useFinishSession,LoginPage}.tsx|ts`.
Thêm `shared/api/authRedirect.test.ts` (3 test). KHÔNG đổi backend, KHÔNG đổi hợp đồng REST.
`npm run build` xanh; vitest 682 pass (1 fail có sẵn: `sse.test.ts`, lỗi CRLF không liên quan).

## Capabilities

### New Capabilities

- `admin-login-single-attempt`: một lần đăng nhập đúng là vào được trang quản trị, và chấp nhận
  email lẫn tên đăng nhập.
