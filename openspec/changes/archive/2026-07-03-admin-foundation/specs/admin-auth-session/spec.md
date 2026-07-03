# admin-auth-session

## ADDED Requirements

### Requirement: Credential login
The system SHALL authenticate admins via email/password against `POST /api/v1/admin/auth/login` and establish a session from the returned access/refresh tokens.

#### Scenario: Successful login without 2FA
- **WHEN** a user submits valid credentials and their account has 2FA disabled
- **THEN** the system stores the returned tokens and redirects to the requested `returnUrl` or `/`
- **AND** the user profile and permission list are fetched before rendering protected content

#### Scenario: Invalid credentials
- **WHEN** a user submits wrong email or password
- **THEN** the login form shows the backend error message inline
- **AND** no session is created

### Requirement: TOTP two-factor step
The system SHALL require a TOTP code step when the login response indicates `twoFactorRequired`, exchanging the short-lived two-factor token plus OTP for session tokens.

#### Scenario: 2FA-enabled account logs in
- **WHEN** the login response returns `twoFactorRequired: true`
- **THEN** the UI advances to an OTP input step without storing any session tokens
- **AND** submitting a valid OTP establishes the session

#### Scenario: Wrong OTP
- **WHEN** the user submits an incorrect OTP
- **THEN** an inline error is shown and the user may retry on the same step

#### Scenario: Expired two-factor token
- **WHEN** the two-factor token expires before a valid OTP is submitted
- **THEN** the UI returns to the credentials step with an explanatory message

### Requirement: Remember me controls refresh token persistence
The system SHALL persist the refresh token in durable storage only when "remember me" is checked; otherwise the session SHALL NOT survive closing the browser.

#### Scenario: Remember me checked
- **WHEN** the user logs in with remember me checked and later reopens the browser
- **THEN** the session is restored via the refresh token without re-entering credentials

#### Scenario: Remember me unchecked
- **WHEN** the user logs in without remember me and closes the browser
- **THEN** reopening the app requires a fresh login

### Requirement: Automatic session refresh
The system SHALL automatically renew the access token using the refresh token when a request returns 401, retrying the original request transparently.

#### Scenario: Access token expires during use
- **WHEN** any API call returns 401 while a valid refresh token exists
- **THEN** the client refreshes the session once and replays the failed request
- **AND** the user experiences no logout

#### Scenario: Refresh token invalid
- **WHEN** the refresh call itself fails
- **THEN** the session is cleared and the user is redirected to `/login` with the current path as `returnUrl`
- **AND** a "session expired" notice is shown

### Requirement: Logout
The system SHALL invalidate the session on logout by calling the backend and clearing all locally stored tokens and cached user data.

#### Scenario: User logs out
- **WHEN** the user confirms logout from the user menu
- **THEN** tokens are removed from all storages, the query cache holding user data is cleared, and the user lands on `/login`

#### Scenario: Logged-out user hits a protected route
- **WHEN** a user without a session navigates to any protected route
- **THEN** they are redirected to `/login` carrying the attempted path as `returnUrl`
- **AND** no protected data request is issued
