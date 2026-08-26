# admin-login-single-attempt

## ADDED Requirements

### Requirement: A background request must not end the session

A request marked `bestEffortAuth` SHALL NOT be able to terminate the caller's session. On `401`
the client MAY still attempt a token refresh, but when that refresh fails the client SHALL only
reject the promise: it SHALL NOT clear the auth store and SHALL NOT navigate the browser. Requests
not marked `bestEffortAuth` SHALL keep the existing behaviour (clear session, redirect to `/login`).
`GET /identity/me/permissions` (the `superAdmin` flag fetched alongside `me`) SHALL be marked
`bestEffortAuth`.

#### Scenario: Best-effort call fails right after login

- **WHEN** a `bestEffortAuth` request returns `401` and the refresh also fails
- **THEN** the access token in the store SHALL be unchanged and no redirect SHALL occur

#### Scenario: Ordinary call still ends an expired session

- **WHEN** an ordinary request returns `401` and the refresh fails
- **THEN** the session SHALL be cleared and the browser SHALL be sent to `/login`

### Requirement: No hard reload while on the login page

`redirectToLogin` SHALL do nothing when the browser is already on `/login`, because it navigates by
assigning `window.location.href` — a hard reload that aborts every in-flight request, including the
sign-in request the user just submitted.

#### Scenario: 401 arrives while the user is signing in

- **WHEN** a `401` with a failed refresh occurs while `window.location.pathname` is `/login`
- **THEN** no navigation SHALL be performed and the in-flight sign-in request SHALL be left alone

### Requirement: A refreshed request is retried at most once

After a successful refresh the client SHALL retry the original request once and mark it retried. A
request already marked retried SHALL NOT trigger another refresh.

#### Scenario: Token is refreshed but the resource still rejects

- **WHEN** the retried request returns `401` again
- **THEN** the error SHALL be surfaced without starting a further refresh cycle

### Requirement: Valid credentials sign the user in on the first attempt

When sign-in returns a valid token pair, the session SHALL be established and the browser SHALL
navigate to the target route — even if loading `me` fails. `me` SHALL be attempted twice; if both
attempts fail the user SHALL still be taken into the console and told the account details are being
reloaded. Permission gates SHALL keep reading permissions from `useMe()`, so a session established
without `me` grants no additional access.

#### Scenario: `me` fails transiently after correct credentials

- **WHEN** both `me` attempts fail but the token pair is valid
- **THEN** the session SHALL be set, the user SHALL land on the target route, and a warning SHALL be
  shown — the user SHALL NOT be left on the sign-in form

### Requirement: Sign-in accepts a username or an email

The sign-in form SHALL accept either an email address or a username in a single field and send it as
`identifier`. The form SHALL NOT reject input for not being an email address.

#### Scenario: Signing in with a username

- **WHEN** an administrator types `admin` and the correct password
- **THEN** the form SHALL submit `identifier: "admin"` without a client-side email validation error
