# user-account-actions

## ADDED Requirements

### Requirement: Lock account with mandatory reason
The system SHALL allow admins holding `user.lock` to lock a user account, requiring a written reason and an explicit confirmation stating the consequences.

#### Scenario: Admin locks an account
- **WHEN** an admin holding `user.lock` clicks "Khoá tài khoản", enters a reason of at least 10 characters, and confirms
- **THEN** the system calls `POST /api/v1/admin/users/:id/lock` with the reason
- **AND** updates the status badge to locked, shows the reason on the profile tab, and the action is recorded in the audit log by the backend

#### Scenario: Reason is missing or too short
- **WHEN** the admin attempts to confirm the lock dialog with an empty or too-short reason
- **THEN** the system blocks submission and shows a validation message on the reason field

#### Scenario: Account already locked by another admin
- **WHEN** the lock request returns a conflict because the account state changed
- **THEN** the system shows a conflict message and refetches the user detail

#### Scenario: Admin without lock permission
- **WHEN** an admin lacking `user.lock` views the user detail page
- **THEN** the lock and unlock buttons SHALL NOT be rendered

### Requirement: Unlock account with mandatory reason
The system SHALL allow admins holding `user.lock` to unlock a locked account, requiring a reason and confirmation.

#### Scenario: Admin unlocks an account
- **WHEN** an admin holding `user.lock` confirms the unlock dialog with a reason
- **THEN** the system calls the unlock endpoint and updates the status badge to active
- **AND** the unlock event appears in the user's security log

### Requirement: Force password reset
The system SHALL allow admins holding `user.reset_password` to invalidate the user's current password and trigger a reset flow.

#### Scenario: Admin forces a reset
- **WHEN** an admin holding `user.reset_password` confirms the force-reset dialog
- **THEN** the system calls the force-reset endpoint with the notify-user option
- **AND** shows the issued time of the reset and the event appears in the security log

#### Scenario: Admin without reset permission
- **WHEN** an admin lacking `user.reset_password` views the user detail page
- **THEN** the force-reset button SHALL NOT be rendered

### Requirement: Revoke sessions
The system SHALL allow admins holding `user.session_revoke` to revoke selected sessions or all sessions of a user after confirmation.

#### Scenario: Admin revokes selected sessions
- **WHEN** an admin holding `user.session_revoke` selects one or more sessions and confirms the revoke dialog
- **THEN** the system calls the revoke endpoint with the selected session ids
- **AND** refreshes the session list and security log to reflect the revocation count

#### Scenario: Admin revokes all sessions
- **WHEN** the admin chooses "revoke all" and confirms
- **THEN** the system sends the all-sessions directive in a single request

#### Scenario: Admin without revoke permission
- **WHEN** an admin lacking `user.session_revoke` opens the sessions tab
- **THEN** sessions remain visible read-only and the revoke controls SHALL NOT be rendered

### Requirement: Stale permission handling on mutations
The system SHALL handle backend authorization failures on account actions even when the button was visible.

#### Scenario: Permission revoked mid-session
- **WHEN** any account action request returns 403 because the caller's permission was revoked after page load
- **THEN** the system shows a message that the permission is no longer held
- **AND** refreshes the cached permission set so dependent controls disappear
