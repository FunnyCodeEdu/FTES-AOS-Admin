# rbac-access-review

## Purpose

(TBD — capability purpose for rbac-access-review)

## Requirements

### Requirement: Effective access by user
The system SHALL show, for a selected user, their effective permission set with the source of each permission (which role or which scoped grant, including scope and expiry).

#### Scenario: Review a moderator's access
- **WHEN** a user with `rbac.matrix.read` selects a user in the matrix view
- **THEN** the effective permissions are shown as a tree
- **AND** each leaf reveals whether it comes from a role or a grant, naming the source

#### Scenario: User lacks rbac.matrix.read
- **WHEN** a user without `rbac.matrix.read` opens `/system/rbac/matrix`
- **THEN** the 403 page is shown naming the missing permission

### Requirement: Holder lookup by permission
The system SHALL show, for a selected permission leaf, all users who hold it, including the source and scope of each holding.

#### Scenario: Who can approve resources
- **WHEN** the reviewer selects the `resource.approve` leaf
- **THEN** all users holding it are listed with source (role or grant) and scope where applicable

#### Scenario: Nobody holds the permission
- **WHEN** the selected permission has no holders
- **THEN** an empty state states that no user currently holds it

### Requirement: Two-way search
The matrix view SHALL provide search by user (email/name) and by permission key from a single screen.

#### Scenario: Switch review modes
- **WHEN** the reviewer switches between by-user and by-permission modes
- **THEN** the corresponding search input and results replace the previous ones without losing the other mode's last query during the session

### Requirement: Audit trail visibility for permission changes
Every permission mutation made through the RBAC console SHALL result in a visible audit reference in the UI upon success, and the review screens SHALL reflect the change after invalidation without page reload.

#### Scenario: Change visible in matrix after grant
- **WHEN** a scoped grant is created for a user
- **THEN** re-opening that user in the matrix shows the new permission with its grant source
- **AND** the success toast of the mutation included an audit reference

#### Scenario: Review data fails to load
- **WHEN** the matrix request fails
- **THEN** an error state with retry is shown instead of stale or empty results
