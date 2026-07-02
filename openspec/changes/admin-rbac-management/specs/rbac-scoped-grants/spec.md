# rbac-scoped-grants

## ADDED Requirements

### Requirement: Grant creation with scope, expiry, and reason
The system SHALL allow users with `rbac.grant.manage` to grant a scopable permission on a specific scope (GROUP, SUBJECT, or RESOURCE_SET), with a mandatory expiry date and a mandatory reason note.

#### Scenario: Grant a CTV group permission
- **WHEN** an authorized user grants a scopable permission on scope type GROUP with a chosen group, expiry, and reason
- **THEN** the grant is persisted and appears in the user's grant table with scope name, expiry, reason, and grantor

#### Scenario: Missing expiry or reason blocked
- **WHEN** the form is submitted without an expiry date or without a reason
- **THEN** client-side validation blocks submission and marks the missing fields

#### Scenario: User lacks rbac.grant.manage
- **WHEN** a user without `rbac.grant.manage` views a user's access detail
- **THEN** the grants section is read-only with no grant or revoke actions rendered

### Requirement: Scope picker limited to valid scopes
The grant form SHALL let the grantor pick the scope via a server-side search over valid scopes of the selected scope type only.

#### Scenario: Pick a subject scope
- **WHEN** the grantor selects scope type SUBJECT and types a search term
- **THEN** only matching subjects are offered
- **AND** free-text scope ids cannot be submitted

#### Scenario: Backend rejects invalid scope
- **WHEN** the backend rejects the grant (invalid scope or expiry beyond the allowed maximum)
- **THEN** the error is shown inside the form and entered values are preserved

### Requirement: Grant revocation with confirmation
The system SHALL allow revoking a grant behind a confirmation that states exactly which permission on which scope the target loses, requiring a reason, and surfacing the audit reference.

#### Scenario: Revoke a grant
- **WHEN** an authorized user revokes a grant and provides a reason
- **THEN** the confirmation names the permission, scope, and target user before executing
- **AND** the grant disappears from the table after success with an audit reference shown

### Requirement: Expiry visibility
The system SHALL visually distinguish grants expiring within 7 days and grants already expired.

#### Scenario: Grant nearing expiry
- **WHEN** a grant expires in fewer than 7 days
- **THEN** it is marked as expiring soon in the grant table

#### Scenario: Expired grant displayed
- **WHEN** a grant's expiry has passed
- **THEN** it is shown as expired and visually de-emphasized
- **AND** it no longer contributes to the target user's effective access
