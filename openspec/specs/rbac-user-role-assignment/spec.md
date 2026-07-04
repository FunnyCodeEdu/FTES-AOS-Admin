# rbac-user-role-assignment

## Purpose

(TBD — capability purpose for rbac-user-role-assignment)

## Requirements

### Requirement: User access lookup
The system SHALL allow searching users by email or name and viewing their current roles and scoped grants with assignment metadata (who assigned, when).

#### Scenario: Search and open a user
- **WHEN** a user with `rbac.assignment.manage` searches for a user and opens their detail
- **THEN** the detail shows current roles with assignedBy/assignedAt and current scoped grants

#### Scenario: User lacks rbac.assignment.manage
- **WHEN** a user without `rbac.assignment.manage` opens `/system/rbac/users`
- **THEN** the 403 page is shown naming the missing permission
- **AND** no user search request is issued

### Requirement: Assign and revoke roles
The system SHALL allow assigning a role to a user and revoking a role from a user, each behind a confirmation stating the consequence, with revocation requiring a reason.

#### Scenario: Assign a role
- **WHEN** an authorized user assigns a role
- **THEN** a confirmation lists the permissions the target user will gain
- **AND** after confirmation the assignment is persisted and the access view refreshes

#### Scenario: Revoke a role
- **WHEN** an authorized user revokes a role
- **THEN** the confirmation states which permissions the target loses and requires a reason
- **AND** the audit reference is surfaced after success

#### Scenario: Assignment rejected by backend
- **WHEN** the backend rejects the assignment
- **THEN** the backend message is shown and the user's displayed access is unchanged

### Requirement: Domain admin appointment via presets
The system SHALL support appointing a user as a domain admin (admin-users, admin-academic, admin-commerce, admin-community, admin-operations) by assigning the corresponding preset role, with the confirmation highlighting dangerous permissions included.

#### Scenario: Appoint an academic admin
- **WHEN** an authorized user selects the admin-academic preset for a target user
- **THEN** the confirmation summarizes the permission count and highlights dangerous permissions in the preset
- **AND** after confirmation the user holds the preset role

#### Scenario: Preset already assigned
- **WHEN** the target user already holds the selected preset
- **THEN** the preset option is disabled with an explanation

### Requirement: Self-change takes effect immediately
The system SHALL refresh the current session's permission set when the acting user's own access is modified.

#### Scenario: Admin changes their own roles
- **WHEN** the acting user modifies their own role assignments
- **THEN** their session profile is refetched
- **AND** navigation and route access re-evaluate without re-login

### Requirement: Permission change history per user
The system SHALL display a per-user history of permission-affecting changes (role assignments/revocations, grants) sourced from the audit log.

#### Scenario: View a user's access history
- **WHEN** an authorized user opens the history section of a user's access detail
- **THEN** entries show the action, actor, timestamp, and reason where recorded
