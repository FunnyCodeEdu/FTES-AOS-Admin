# Tasks — admin-login-single-attempt (Admin)

## 1. Interceptor 401 không được giết phiên vì một request phụ
- [x] 1.1 Khai báo `bestEffortAuth` + `_retried` trên `AxiosRequestConfig` (declare module "axios")
- [x] 1.2 Refresh trượt: chỉ `clearSession()` + điều hướng khi KHÔNG phải `bestEffortAuth`
- [x] 1.3 `_retried` chặn vòng lặp 401 → refresh → 401
- [x] 1.4 `redirectToLogin()` no-op khi `window.location.pathname === "/login"`
- [x] 1.5 `fetchSuperAdmin()` gọi với `{ bestEffortAuth: true }`

## 2. Đăng nhập đúng một lần
- [x] 2.1 `useFinishSession` thử `me` hai lần
- [x] 2.2 `me` vẫn hỏng thì lập phiên + điều hướng (toast cảnh báo), không đứng lại ở form
- [x] 2.3 Kiểm chứng mọi cổng quyền đọc từ `useMe()` (PermissionRoute/NavMenu/Can/AdminLayout)

## 3. Đăng nhập bằng username
- [x] 3.1 `LoginCredentials.email` → `identifier`; mutation gửi `identifier`
- [x] 3.2 Form: nhãn "Email hoặc tên đăng nhập", `name="identifier"`, bỏ rule `type: "email"`

## 4. Verify
- [x] 4.1 `shared/api/authRedirect.test.ts`: bestEffortAuth giữ phiên / request thường xoá phiên /
  đang ở `/login` thì không reload
- [x] 4.2 `npm run build` (tsc -b && vite build) xanh
- [x] 4.3 `npx vitest run` — 682 pass, 1 fail có sẵn (`sse.test.ts`, CRLF)
