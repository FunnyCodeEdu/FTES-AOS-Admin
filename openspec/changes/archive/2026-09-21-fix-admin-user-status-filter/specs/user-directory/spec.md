# user-directory

## MODIFIED Requirements

### Requirement: Filter by role, status, and campus
The system SHALL provide server-side filters for role, account status, and campus that can be combined with search, and SHALL translate user-facing status values to the backend account-status contract.

#### Scenario: Admin combines filters
- **WHEN** the admin selects a role, a status, and a campus
- **THEN** the system sends all selected filter values in one list request
- **AND** displays active filters so each can be individually removed.

#### Scenario: Admin filters active users
- **WHEN** the admin selects the active account status
- **THEN** the system sends `ACTIVE` in the GraphQL `AdminUserFilter.status`
- **AND** keeps `status=active` in the shareable URL.

#### Scenario: Admin filters pending-verification users
- **WHEN** the admin selects the pending account status
- **THEN** the system sends `PENDING_VERIFICATION` in the GraphQL filter
- **AND** renders returned accounts as "Chờ xác nhận".

#### Scenario: Admin filters disabled users
- **WHEN** the admin selects the disabled account status
- **THEN** the system sends `DISABLED` in the GraphQL filter
- **AND** renders returned accounts as "Đã vô hiệu hoá".

## ADDED Requirements

### Requirement: Consistent account status presentation
The system SHALL normalize backend account statuses before list and detail components make presentation or action decisions.

#### Scenario: Backend returns a known status
- **WHEN** the list or detail query returns `ACTIVE`, `LOCKED`, `PENDING_VERIFICATION`, or `DISABLED`
- **THEN** the UI uses the matching Vietnamese label and color consistently.

#### Scenario: Backend returns an unknown status
- **WHEN** the backend introduces a status that the admin UI does not yet recognize
- **THEN** the UI displays that status with default styling
- **AND** SHALL NOT label it as active.
