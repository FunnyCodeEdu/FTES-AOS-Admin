# security-log-viewer

## ADDED Requirements

### Requirement: Security event listing

The system SHALL display security events at `/system/security-log` for users holding
`security.log.view`, in a server-side paginated read-only table covering anomalous logins,
account locks, and permission changes, filterable by event type, user, and time range.

#### Scenario: Reviewing anomalous logins

- **WHEN** a user with `security.log.view` filters by type login anomaly over the last 24 hours
- **THEN** the system queries `GET /api/v1/admin/audit/security-events` with those parameters
  and lists matching events with user, IP, device, severity, and timestamp

#### Scenario: User without security log permission

- **WHEN** a user lacking `security.log.view` navigates directly to `/system/security-log`
- **THEN** the system renders the 403 Forbidden page listing the missing permission
- **AND** the Security Log nav item is not rendered for that user

### Requirement: Event detail

The system SHALL show a read-only detail drawer for each security event including the related
user, IP address, device information, and event-specific context (for permission changes: which
permissions changed and by whom).

#### Scenario: Inspecting a permission change event

- **WHEN** the user opens a permission-change event
- **THEN** the drawer shows the affected user, the actor who made the change, and the permission
  set before and after

### Requirement: Pivot to user console

The system SHALL provide a navigation link from a security event to the related user's detail
page in the user console so follow-up actions (such as locking the account) happen in the
console that owns them.

#### Scenario: Following up on an anomaly

- **WHEN** the user clicks the related user link in an event detail
- **THEN** the system navigates to `/users/:id`; whether lock actions are available there is
  governed by the user console permissions, not by this viewer

### Requirement: Security log is read-only

The system SHALL render no mutation affordance in the security log viewer; all remediation
actions live in their owning consoles.

#### Scenario: No inline remediation

- **WHEN** a user browses security events
- **THEN** no lock, unlock, or permission-edit control is rendered inside the security log
  viewer

### Requirement: Security viewer UX states

The system SHALL render a skeleton table while loading, an empty state when no events match,
and an error state with retry on failure.

#### Scenario: Quiet period

- **WHEN** the security events query returns zero items for the selected range
- **THEN** the system shows an empty state indicating no security events in that period
