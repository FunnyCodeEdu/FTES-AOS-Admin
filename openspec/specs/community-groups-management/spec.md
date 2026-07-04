# community-groups-management Specification

## Purpose
TBD - created by archiving change admin-community-console. Update Purpose after archive.
## Requirements
### Requirement: Groups list and detail

The system SHALL display community groups at `/community/groups` in a server-side paginated
table with search and status filter, and a detail page at `/community/groups/:groupId` with
Overview, Members, Posts, and CTV assignments tabs, for users holding `group.view`.

#### Scenario: Browsing groups

- **WHEN** a user with `group.view` searches for a group name
- **THEN** the system queries `GET /api/v1/admin/community/groups` with search and pagination
  parameters and renders name, owner, member count, status, and assigned CTVs per row

#### Scenario: User without group permission

- **WHEN** a user lacking `group.view` navigates directly to `/community/groups/:groupId`
- **THEN** the system renders the 403 Forbidden page listing the missing permission

### Requirement: Transfer group ownership

The system SHALL allow users holding `group.transfer` to transfer group ownership to another
member via a user-search modal, requiring a confirmation that states the consequence and a
mandatory reason, and the action SHALL be auditable.

#### Scenario: Transferring ownership

- **WHEN** a user with `group.transfer` selects a new owner and confirms with a reason
- **THEN** the system calls `POST /api/v1/admin/community/groups/:id/transfer-owner` with
  `{newOwnerId, reason}` and the detail page shows the new owner after invalidation
- **AND** the action is recorded in the audit log by the backend

#### Scenario: User without transfer permission

- **WHEN** a user holds `group.view` but not `group.transfer`
- **THEN** the Transfer Owner action is not rendered on the group detail page

### Requirement: Lock and unlock groups

The system SHALL allow users holding `group.lock` to lock or unlock a group, where locking
requires a confirmation dialog stating the consequences (members cannot post, group hidden from
discovery) and a mandatory reason.

#### Scenario: Locking a group

- **WHEN** a user with `group.lock` confirms Lock with a reason
- **THEN** the system calls `POST /api/v1/admin/community/groups/:id/lock` with `{reason}` and
  the group status badge changes to Locked
- **AND** a moderation log entry is created for the action

#### Scenario: Locking without reason is blocked

- **WHEN** the Lock confirmation is submitted with an empty reason
- **THEN** submission is blocked with a validation message and no API call is made

### Requirement: Assign CTV to a group

The system SHALL allow users holding `group.assign_ctv` to grant a CTV a scoped permission
subset for a specific group and to revoke such assignments, where the grantable permissions are
limited to the community permission subset defined for CTVs and revocation requires confirmation.

#### Scenario: Granting a CTV assignment

- **WHEN** a user with `group.assign_ctv` selects a user and a subset of community permissions
  and confirms
- **THEN** the system calls `POST /api/v1/admin/community/groups/:id/ctv-assignments` with
  `{userId, permissions}` and the CTV appears in the assignments tab

#### Scenario: CTV subset excludes admin-only permissions

- **WHEN** the assigner opens the permission picker for a CTV assignment
- **THEN** admin-only permissions such as `group.lock`, `group.transfer`, and
  `workflow.publish` are not offered as grantable options

#### Scenario: Revoking an assignment

- **WHEN** the user confirms revocation of a CTV assignment
- **THEN** the system deletes the assignment and the CTV loses group access after the next
  permission refresh

### Requirement: Groups UX states

The system SHALL render skeleton layouts mirroring the table and detail tabs while loading, an
empty state for lists with no results, and error states with retry.

#### Scenario: Group detail fetch fails

- **WHEN** the group detail query fails
- **THEN** the system shows an error state with a retry action instead of partial content

