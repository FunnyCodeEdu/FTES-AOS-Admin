# admin-auth

## ADDED Requirements

### Requirement: Admin auth uses the real FTES-AOS backend contract
The admin CMS SHALL authenticate against the FTES-AOS backend `/api/v1/auth` surface using a dedicated `authClient`, sending `identifier` (not `email`), treating the `{code,message,data}` envelope as successful on 2xx, and mapping the backend `TokenResponse` (`mfaRequired`, `challengeId`) to the UI login model.

#### Scenario: Successful login
- **WHEN** an admin submits credentials
- **THEN** the CMS POSTs `/api/v1/auth/login` with `{identifier, password}` and, on a 2xx envelope, stores `accessToken`/`refreshToken`

#### Scenario: MFA required
- **WHEN** the backend responds with `mfaRequired=true` and a `challengeId`
- **THEN** the CMS maps it to `twoFactorRequired`/`twoFactorToken` and routes to `/auth/mfa/verify`

#### Scenario: Token refresh
- **WHEN** an access token expires
- **THEN** the CMS refreshes via `/api/v1/auth/refresh` (not the admin base path)

#### Scenario: Base URL configurable
- **WHEN** deployed to apitest
- **THEN** `VITE_API_BASE_URL=https://apitest.ftes.vn` and requests go to `{base}/api/v1/...` (not relative `/api`)
