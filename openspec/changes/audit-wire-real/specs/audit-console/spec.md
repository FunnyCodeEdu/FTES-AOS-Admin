## ADDED Requirements

### Requirement: Audit console reads come from the GraphQL admin gateway (no mock)

The audit console SHALL source all READ data from the BE GraphQL admin read gateway, not from mock
generators or non-existent REST endpoints. The audit-log list maps from `adminAuditLogs(filter, page)`
(guard `admin.audit.read`); the security-event list maps from `adminUserSecurityLog(userId, page)`
(guard `admin.user.security-log`). Fields the GraphQL schema does not expose (actor name/email, audit
before/after diff, security severity) SHALL be labeled/derived safely, never fabricated. No mock code
path SHALL remain.

#### Scenario: Audit log list loads from adminAuditLogs

- **WHEN** an admin opens the audit log page
- **THEN** rows come from the `adminAuditLogs` GraphQL query with `resourceType` mapped to
  domain/target, `actorId` shown as the actor label, and 0-based BE paging mapped to 1-based UI paging

#### Scenario: Audit log detail opens from the list row

- **WHEN** an admin clicks an audit log row
- **THEN** the detail drawer renders from the already-loaded list row (no by-id request), with
  before/after/metadata/ip left null so the diff view shows "no change data" — because BE exposes no
  audit detail-by-id endpoint

#### Scenario: Security event list requires a user id

- **WHEN** an admin opens the security log page without entering a User ID
- **THEN** no request is made and the page prompts for a User ID — because BE only exposes security log
  per user (`adminUserSecurityLog`), not a global list

#### Scenario: Security events map from adminUserSecurityLog

- **WHEN** an admin enters a User ID on the security log page
- **THEN** events come from `adminUserSecurityLog(userId, page)`, with `userAgent` shown as device,
  `detail` parsed into metadata, and severity derived from the normalized event type (no severity
  field exists on the BE view)
