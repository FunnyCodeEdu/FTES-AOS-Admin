# rbac-console Specification

## Purpose
TBD - created by archiving change rbac-console-use-graphql-read. Update Purpose after archive.
## Requirements
### Requirement: RBAC console reads come from the GraphQL admin gateway

The RBAC console SHALL source all READ data from the GraphQL admin read gateway (`admin.rbac.read`
guarded), not from non-existent REST read endpoints. Roles/permissions/grants map from `rbacRoles`,
`rbacPermissions`, `rbacGrants`; user lookup from `adminUsers`/`adminUser`. Fields the GraphQL schema
does not expose SHALL be mapped to a safe placeholder (0/false/undefined/empty) and marked `TODO(BE)`
rather than fabricated. Hook signatures SHALL stay unchanged so pages need no edits. RBAC mutations
SHALL keep using the existing REST command endpoints.

#### Scenario: Role list loads from rbacRoles

- **WHEN** an admin opens the role list
- **THEN** roles come from the `rbacRoles` GraphQL query, `permissionCount` is derived from
  `permissionCodes.length`, and the list filters/paginates client-side

#### Scenario: Permission catalog groups rbacPermissions by domain

- **WHEN** an admin opens the permission catalog
- **THEN** permissions come from `rbacPermissions` grouped by `domain`, with each permission's
  `roles` derived from `rbacRoles.permissionCodes`

#### Scenario: User access detail composes adminUser and rbacGrants

- **WHEN** an admin opens a user's access detail
- **THEN** the user profile comes from `adminUser` and role grants from `rbacGrants`, with
  permission-scoped grants left empty and marked `TODO(BE)` (no backend read exists)

#### Scenario: Effective matrix by user is derived client-side

- **WHEN** an admin selects a user in the access matrix (by-user mode)
- **THEN** the effective permission matrix is derived by joining `rbacGrants` with
  `rbacRoles.permissionCodes`, each permission listing its source role and scope

