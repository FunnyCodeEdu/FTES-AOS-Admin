# admin-auth (delta)

## MODIFIED Requirements

### Requirement: Social sign-in completes on the first attempt

Completing a session after obtaining tokens (password, 2FA, Google or GitHub) SHALL load the current
user without depending on a conditionally-enabled query, so the admin is signed in and redirected on
the first attempt.

#### Scenario: Google sign-in

- **WHEN** an admin signs in with Google once
- **THEN** the session is established and the admin is redirected, without a second sign-in attempt
