# rbac-role-management

## Purpose

(TBD — capability purpose for rbac-role-management)

## Requirements

### Requirement: Role list with usage insight
The system SHALL list roles with server-side pagination and search, showing for each role its permission count, assigned user count, and whether it is a domain-admin preset.

#### Scenario: Admin browses roles
- **WHEN** a user with `rbac.role.read` opens `/system/rbac/roles`
- **THEN** roles are listed with name, description, permission count, user count, and preset flag
- **AND** search filters the list server-side

#### Scenario: User lacks rbac.role.read
- **WHEN** a user without `rbac.role.read` navigates to `/system/rbac/roles`
- **THEN** the 403 page is shown naming `rbac.role.read` as the missing permission
- **AND** the RBAC navigation entry was never rendered for them

### Requirement: Role creation and editing as permission sets
The system SHALL allow creating and editing a role as a named set of permission leaves selected on a domain-grouped permission tree, without any frontend logic keyed on role names.

#### Scenario: Create a role
- **WHEN** a user with `rbac.role.manage` creates a role with a name, description, and selected permissions
- **THEN** the role is saved via the backend and appears in the list
- **AND** the editor validates that at least one permission is selected

#### Scenario: Edit a role in use
- **WHEN** a user edits the permission set of a role assigned to users
- **THEN** a warning shows how many users are affected before saving

#### Scenario: User lacks rbac.role.manage
- **WHEN** a user with only `rbac.role.read` views the role list
- **THEN** create, edit, and clone actions are not rendered
- **AND** direct navigation to the role editor results in the 403 page naming `rbac.role.manage`

### Requirement: Role cloning
The system SHALL allow cloning an existing role into a new role carrying the same permission set under a new name.

#### Scenario: Clone a preset to customize
- **WHEN** a user with `rbac.role.manage` clones a preset role and provides a new name
- **THEN** a new non-preset role is created with an identical permission set
- **AND** the original role is unchanged

### Requirement: Confirm with diff on role permission changes
The system SHALL, before persisting any role permission change, show a confirmation dialog with the added and removed permissions and the number of affected users, and SHALL surface the audit reference after success.

#### Scenario: Save shows diff
- **WHEN** a user saves a role whose permission set changed
- **THEN** a confirmation dialog lists added permissions, removed permissions, and affected user count
- **AND** the change is only sent after explicit confirmation

#### Scenario: Cancel keeps draft
- **WHEN** the user cancels the confirmation dialog
- **THEN** no request is sent and the unsaved draft remains in the editor

#### Scenario: Backend rejects the change
- **WHEN** the backend rejects the role update
- **THEN** the error message is shown inside the dialog and the draft is preserved
