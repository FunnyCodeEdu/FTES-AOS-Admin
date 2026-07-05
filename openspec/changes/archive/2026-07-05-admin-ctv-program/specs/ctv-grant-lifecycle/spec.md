# ctv-grant-lifecycle

## ADDED Requirements

### Requirement: CTV roster for domain admins
The system SHALL list the domain's CTV members for admins holding `ctv.member.read`, showing scopes, active grant count, nearest expiry, and a 30-day KPI summary.

#### Scenario: Admin browses roster
- **WHEN** an admin with `ctv.member.read` opens `/ctv-program/members`
- **THEN** members list with scopes, active grants, nearest expiry, and KPI summary
- **AND** members whose grants are near expiry are visually flagged

#### Scenario: User lacks ctv.member.read
- **WHEN** a user without `ctv.member.read` opens `/ctv-program/members`
- **THEN** the 403 page is shown naming the missing permission

### Requirement: Grant extension
The system SHALL allow admins holding `ctv.member.manage` to extend selected grants to a new expiry with a mandatory reason, behind a confirmation showing old and new expiry.

#### Scenario: Extend grants
- **WHEN** an admin selects grants, sets a new expiry, and provides a reason
- **THEN** the confirmation shows each grant's old and new expiry before executing
- **AND** after success the grants show the new expiry and an audit reference is surfaced

#### Scenario: Admin lacks ctv.member.manage
- **WHEN** an admin with only `ctv.member.read` opens a member detail
- **THEN** extend, expand, and revoke actions are not rendered

### Requirement: Scope and permission expansion
The system SHALL allow admins holding `ctv.member.manage` to expand a CTV's access with additional scopes or permissions (within the admin's grantable set), with expiry, reason, and confirmation.

#### Scenario: Expand a CTV to another group
- **WHEN** an admin adds a new GROUP scope with permissions from their grantable set
- **THEN** new grants are created after confirmation and appear in the member's grant table
- **AND** the CTV's workspace gains the scope after their profile refreshes without re-login

#### Scenario: Expansion outside grantable set blocked
- **WHEN** the expansion form is used
- **THEN** permissions outside the acting admin's grantable set are never offered
- **AND** a backend rejection for an invalid combination is shown inside the form

### Requirement: Grant revocation
The system SHALL allow revoking one or more grants with a mandatory reason, behind a confirmation stating the CTV immediately loses the named permissions on the named scopes.

#### Scenario: Revoke a CTV's group grant
- **WHEN** an admin revokes a grant and provides a reason
- **THEN** the confirmation names the permission, scope, and consequence before executing
- **AND** after success the CTV's workspace drops that scope on next profile refresh

#### Scenario: Concurrent revocation conflict
- **WHEN** the targeted grant was already revoked by another admin
- **THEN** the member data is refetched and the current state is displayed with an explanatory message

### Requirement: Complete lifecycle history
The member detail SHALL show a full timeline of the CTV's lifecycle events — invite, acceptance, extensions, expansions, revocations — each with actor, timestamp, detail, and reason.

#### Scenario: Audit a member's history
- **WHEN** an admin with `ctv.member.read` opens the history tab
- **THEN** all lifecycle events are listed chronologically with actor and reason
- **AND** the history is read-only
