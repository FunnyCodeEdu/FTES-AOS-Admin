# user-detail

## ADDED Requirements

### Requirement: User detail page with tabbed layout
The system SHALL render a user detail page at `/users/:id` with a profile header and tabs for profile, learning summary, transaction summary, devices & sessions, and security log.

#### Scenario: Admin opens a user detail
- **WHEN** an admin holding `user.view` navigates to `/users/:id`
- **THEN** the system loads the user profile and renders the header with avatar, name, email, status badge, and role tags
- **AND** renders a skeleton mirroring the header-plus-tabs layout while loading

#### Scenario: User id does not exist
- **WHEN** the profile request returns not-found
- **THEN** the system shows a not-found state with a link back to `/users`

### Requirement: Learning summary tab
The system SHALL show a learning summary including enrolled course count, completion count, certificates, and a server-side paginated enrollment table.

#### Scenario: Admin opens the learning tab
- **WHEN** the admin activates the Học tập tab for the first time
- **THEN** the system lazily fetches the learning summary for that user
- **AND** renders enrollment rows with course name, progress, and enrollment date

### Requirement: Transaction summary tab
The system SHALL show a transaction summary including total spend, order count, wallet balance, and recent transactions with a link to the commerce console filtered by this user.

#### Scenario: Admin reviews transactions
- **WHEN** the admin activates the Giao dịch tab
- **THEN** the system displays total spend, order count, wallet balance, and the most recent transactions
- **AND** provides a link to `/commerce/orders?userId=:id` for the full history

### Requirement: Devices and sessions tab
The system SHALL list the user's active sessions with device, IP address, and last-active time.

#### Scenario: Admin views active sessions
- **WHEN** the admin activates the Thiết bị & Session tab
- **THEN** the system lists each active session with device, IP, and last-active timestamp
- **AND** marks which session, if any, is the user's current session

### Requirement: Security log tab
The system SHALL show a server-side paginated security event log filterable by event type and date range.

#### Scenario: Admin filters the security log
- **WHEN** the admin selects an event type and a date range in the Security log tab
- **THEN** the system requests the log with those filter parameters and resets to page 1
- **AND** renders events in reverse chronological order

#### Scenario: Security log is empty
- **WHEN** the user has no security events matching the filters
- **THEN** the system shows an empty state instead of an empty table

### Requirement: Detail access control
The system SHALL gate the user detail route on `user.view`.

#### Scenario: Admin without user.view opens a detail URL
- **WHEN** a signed-in admin lacking `user.view` navigates to `/users/:id` by URL
- **THEN** the system renders the Forbidden page identifying the missing permission
- **AND** issues no user data requests
