# user-role-assignment

## ADDED Requirements

### Requirement: Role change gated by RBAC permission
The system SHALL render the role-change action only for callers holding `rbac.role.assign`; the control SHALL be hidden, not disabled, for all other callers.

#### Scenario: Caller holds rbac.role.assign
- **WHEN** an admin holding `rbac.role.assign` opens a user detail page
- **THEN** the "Đổi role" button is rendered in the action row

#### Scenario: Caller lacks rbac.role.assign
- **WHEN** an admin lacking `rbac.role.assign` opens a user detail page
- **THEN** the "Đổi role" button SHALL NOT be present in the DOM
- **AND** no role-management API is called from this page

### Requirement: Role change dialog with diff and reason
The system SHALL present the role change as a diff of added and removed roles and require a written reason before submission.

#### Scenario: Admin edits roles
- **WHEN** the admin opens the role dialog and modifies the role selection
- **THEN** the system displays which roles will be added and which removed relative to the current assignment
- **AND** keeps the submit action disabled until a reason is provided

### Requirement: Double confirmation on role change
The system SHALL require a second explicit confirmation stating that the user's effective permissions change immediately.

#### Scenario: Admin confirms a role change
- **WHEN** the admin submits the role dialog and accepts the second confirmation
- **THEN** the system calls `PUT /api/v1/admin/users/:id/roles` with the role ids and reason
- **AND** refreshes the user detail and user list, and the change is recorded in the audit log by the backend

#### Scenario: Backend rejects the assignment
- **WHEN** the role update returns an error (validation, conflict, or 403)
- **THEN** the system keeps the dialog open with the error message and does not alter the displayed roles

### Requirement: Role options come from the RBAC catalog
The system SHALL load assignable roles from the RBAC management API rather than a hardcoded list.

#### Scenario: Dialog loads role options
- **WHEN** the role dialog opens
- **THEN** the system fetches the assignable role list from the RBAC API
- **AND** shows a loading state in the selector until options arrive, and an error state with retry if the fetch fails
