## MODIFIED Requirements

### Requirement: RBAC console reads come from the GraphQL admin gateway

The RBAC console SHALL source all READ data from the GraphQL admin read gateway (`admin.rbac.read`
guarded). Where the gateway now exposes real fields, the console SHALL consume them instead of the
earlier placeholders: role `isPreset`/`userCount` from `rbacRoles`, permission `scopable` from
`rbacPermissions`, permission-scoped grants from `rbacPermissionGrants`, reverse matrix from
`rbacMatrixByPermission`, and the user audit trail from `rbacUserAudit`. Remaining gaps that identity
does not back (scope catalog for `useScopes`, per-user `grantCount`, human scope names, SUPER_ADMIN in
reverse matrix) SHALL stay documented rather than fabricated. Hook signatures SHALL stay unchanged and
RBAC mutations SHALL keep using the existing REST command endpoints.

#### Scenario: Role list shows real preset flag and user count

- **WHEN** an admin opens the role list
- **THEN** `isPreset` and `userCount` come from `rbacRoles`, and preset roles are labelled by their
  role code

#### Scenario: Scoped-grant modal filters real scopable permissions

- **WHEN** an admin opens the scoped-grant modal
- **THEN** the permission options are those where `rbacPermissions` reports `scopable = true`

#### Scenario: User access shows permission-scoped grants and audit trail

- **WHEN** an admin opens a user's access detail
- **THEN** the "scoped grants" tab lists grants from `rbacPermissionGrants` and the "history" tab
  lists entries from `rbacUserAudit`, with `scopeName` falling back to `scopeId` and `reason` empty
  because the grant model stores neither

#### Scenario: Access matrix by permission is populated

- **WHEN** an admin looks up a permission in the access matrix (by-permission mode)
- **THEN** the table lists holders from `rbacMatrixByPermission` with their granting source and scope
