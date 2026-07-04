# rbac-permission-catalog

## Purpose

(TBD — capability purpose for rbac-permission-catalog)

## Requirements

### Requirement: Domain-grouped permission catalog
The system SHALL display the backend permission catalog as leaves grouped by domain (users, academic, commerce, community, operations, system), each with its key and human-readable description.

#### Scenario: Browse the catalog
- **WHEN** a user with `rbac.permission.read` opens `/system/rbac/permissions`
- **THEN** permission leaves are grouped by domain in collapsible sections
- **AND** each leaf shows its key and description

#### Scenario: User lacks rbac.permission.read
- **WHEN** a user without `rbac.permission.read` opens `/system/rbac/permissions`
- **THEN** the 403 page is shown naming the missing permission

### Requirement: Catalog search
The system SHALL support searching permission leaves by key or description across all domains.

#### Scenario: Search by key fragment
- **WHEN** the user types "approve" in the catalog search
- **THEN** only leaves whose key or description matches are shown, with their domain kept visible

#### Scenario: No match
- **WHEN** the search matches nothing
- **THEN** an empty state suggests adjusting the query

### Requirement: Reverse lookup to roles
The catalog SHALL show, for each permission leaf, which roles currently include it, linking to the role editor.

#### Scenario: Inspect which roles carry a permission
- **WHEN** the user expands a permission leaf entry
- **THEN** the roles containing that leaf are listed
- **AND** each role links to its editor for users holding `rbac.role.read`

### Requirement: Scopable permission indication
The catalog SHALL indicate which permission leaves can be granted with a scope (GROUP/SUBJECT/RESOURCE_SET), matching what the scoped grant form offers.

#### Scenario: Scopable leaf displayed
- **WHEN** a leaf is flagged scopable by the backend
- **THEN** the catalog marks it as grantable per scope
- **AND** non-scopable leaves show no such mark
