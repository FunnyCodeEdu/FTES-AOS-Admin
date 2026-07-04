# user-impersonation

## ADDED Requirements

### Requirement: Impersonation restricted to user.impersonate holders
The system SHALL expose the impersonate action and the `/users/:id/impersonate` route only to callers holding `user.impersonate` (granted only to Super Admin presets by the backend).

#### Scenario: Super Admin sees the action
- **WHEN** an admin holding `user.impersonate` opens a user detail page
- **THEN** the "Xem như user" button is rendered

#### Scenario: Admin without the permission
- **WHEN** an admin lacking `user.impersonate` opens a user detail page
- **THEN** the impersonate button SHALL NOT be present
- **AND** navigating directly to `/users/:id/impersonate` renders the Forbidden page without requesting an impersonation token

### Requirement: Confirmed entry into impersonation
The system SHALL require an explicit confirmation before starting impersonation, stating that the session is read-only and audited.

#### Scenario: Super Admin starts impersonation
- **WHEN** the admin confirms the impersonation dialog
- **THEN** the system calls `POST /api/v1/admin/users/:id/impersonate` and receives a read-only token with an expiry
- **AND** navigates to the impersonation viewer using that token without replacing the admin's own auth token

### Requirement: Read-only impersonation viewer
The system SHALL render the impersonation viewer with a persistent banner identifying the impersonated user and SHALL block all write operations during impersonation.

#### Scenario: Viewer is active
- **WHEN** the impersonation viewer is displayed
- **THEN** a fixed banner shows "Đang xem dưới danh nghĩa {user} — chế độ chỉ đọc" with an exit control
- **AND** interactive write controls inside the viewer are disabled, and any write request made with the impersonation token is rejected by the backend with 403

#### Scenario: Token expires during viewing
- **WHEN** the impersonation token reaches its expiry
- **THEN** the system exits the viewer, clears the impersonation state, and returns to `/users/:id` with a notice

### Requirement: Auditable impersonation lifecycle
The system SHALL treat impersonation start and end as audited security events.

#### Scenario: Impersonation start and exit
- **WHEN** the admin starts and later exits an impersonation session
- **THEN** both events are recorded in the audit log by the backend
- **AND** the target user's security log shows the impersonation session entry
