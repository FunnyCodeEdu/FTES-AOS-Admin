# user-directory

## MODIFIED Requirements

### Requirement: Filter by role, status, and campus
The system SHALL provide server-side filters for role, account status, and campus that can be combined with search, SHALL populate the role selector from the role catalog, and SHALL translate user-facing status values to the backend account-status contract.

#### Scenario: Admin combines filters
- **WHEN** the admin selects a role, a status, and a campus
- **THEN** the system sends all selected filter values in one list request
- **AND** displays active filters so each can be individually removed.

#### Scenario: Admin opens the role filter
- **WHEN** the role catalog loads successfully
- **THEN** the role selector displays each available role
- **AND** selecting a role sends its role code in `AdminUserFilter.role`
- **AND** keeps that role code in the shareable URL.

#### Scenario: Role catalog cannot be loaded
- **WHEN** the role catalog request fails or the admin lacks `admin.rbac.read`
- **THEN** the role selector displays a clear unavailable state and is disabled
- **AND** the user list remains usable.

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
