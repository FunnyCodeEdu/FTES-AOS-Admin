# Tasks — auth-rewire-be-apitest

## 1. HTTP client
- [x] 1.1 Tách `authClient` (baseURL `/api/v1/auth`) khỏi `apiClient`.
- [x] 1.2 Success check `isEnvelopeSuccess` (2xx) thay `code!==0`.
- [x] 1.3 `doRefresh` → `/api/v1/auth/refresh`; PUBLIC_PATHS `/auth/mfa/verify`.

## 2. Auth API
- [x] 2.1 login/logout/verify2fa dùng `authClient`, path `/login`,`/mfa/verify`,`/logout`.
- [x] 2.2 login gửi `identifier` (từ email); map `BackendTokenResponse` → `LoginResponse`.
- [x] 2.3 Giữ nguyên `me{}` GraphQL.

## 3. Env & verify
- [x] 3.1 `.env.example` `VITE_API_BASE_URL=https://apitest.ftes.vn`.
- [x] 3.2 `npm run build` + `tsc --noEmit` xanh.
- [ ] 3.3 Vercel set `VITE_API_BASE_URL` + redeploy (deploy — ngoài repo).
