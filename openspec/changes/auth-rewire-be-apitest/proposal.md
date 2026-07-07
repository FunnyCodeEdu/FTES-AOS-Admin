# auth-rewire-be-apitest — Rewire auth admin CMS khớp BE apitest thật

## Why

Admin CMS (Vite/React) trước đây gọi auth theo contract giả/StarCI: `apiClient` base `/api/v1/admin`,
field `email`, success check `code!==0`, path `/auth/2fa/verify` + refresh `/api/v1/admin/auth/refresh`.
BE FTES-AOS thật (apitest) khác: auth ở `/api/v1/auth`, field `identifier`, envelope `{code,message,data}`
với **code HTTP-style (2xx=OK)**, MFA field `mfaRequired`/`challengeId`, refresh `/api/v1/auth/refresh`,
verify `/auth/mfa/verify`. Không rewire → login 401/parse sai, admin không đăng nhập được.

## What Changes

- **`src/shared/api/client.ts`**: tách `authClient` riêng (baseURL `/api/v1/auth`) khỏi `apiClient`
  (`/api/v1/admin`); success theo `isEnvelopeSuccess` (2xx) thay cho `code!==0`; `doRefresh` path
  `/api/v1/auth/refresh`; PUBLIC_PATHS `/auth/mfa/verify`.
- **`src/features/auth/api.ts`**: login/logout/verify2fa dùng `authClient`; login gửi `identifier`
  (từ `email`); map `BackendTokenResponse` (`mfaRequired`→`twoFactorRequired`,
  `challengeId`→`twoFactorToken`, `accessToken`/`refreshToken`/`expiresIn`). `me{}` GraphQL giữ nguyên.
- **`.env.example`**: `VITE_API_BASE_URL=https://apitest.ftes.vn` + chú thích (local vs apitest).

## Impact

- Code: 3 file (client.ts, auth/api.ts, .env.example). Build + tsc xanh.
- Deploy: Vercel phải set `VITE_API_BASE_URL` trong dashboard rồi redeploy (bundle cũ trỏ `/api`
  relative → 404).
- Không đổi `me{}` GraphQL (đang chạy tốt). Không đụng data-fetch admin (read GraphQL/write REST
  đã wire ở các change trước).
