# ctv-invitation

## ADDED Requirements

### Requirement: Create CTV invite with scope, permissions, and expiry
The system SHALL allow a domain admin holding `ctv.invite.manage` to create a CTV invite specifying recipient email, one or more scopes (GROUP/SUBJECT/RESOURCE_SET), a permission set, a mandatory grant expiry, and a note, producing a shareable invite link and an email delivery.

#### Scenario: Domain admin invites a CTV
- **WHEN** an admin with `ctv.invite.manage` submits the invite form with email, scopes, permissions, expiry, and note
- **THEN** an invite is created and the invite link is returned for copying
- **AND** the email delivery status is displayed

#### Scenario: Admin lacks ctv.invite.manage
- **WHEN** a user without `ctv.invite.manage` opens `/ctv-program/invites`
- **THEN** the 403 page is shown naming the missing permission
- **AND** the CTV program navigation entry was never rendered for them

#### Scenario: Duplicate pending invite
- **WHEN** an invite is created for an email that already has a pending invite
- **THEN** the backend error is shown with a link to the existing invite
- **AND** no duplicate invite is created

### Requirement: Grantable permissions constrained
The invite form SHALL offer only permission leaves the acting admin is allowed to grant, as returned by the backend, filtered to those compatible with the selected scope types.

#### Scenario: Permission options limited
- **WHEN** the admin selects scope type GROUP in the invite form
- **THEN** only grantable permissions applicable to GROUP scopes are offered
- **AND** permissions outside the admin's grantable set never appear

### Requirement: Invite tracking
The system SHALL list invites with status (pending, accepted, expired, revoked), filterable by status, restricted to invites within the acting admin's domain.

#### Scenario: Track invite statuses
- **WHEN** the admin opens the invite list
- **THEN** invites show recipient, scope summary, permissions, expiry, status, and inviter
- **AND** filtering by status narrows the list server-side

#### Scenario: Invite expires unaccepted
- **WHEN** an invite passes its expiry without acceptance
- **THEN** it appears with expired status and its link no longer activates grants

### Requirement: Invite revocation and resend
The system SHALL allow revoking a pending invite behind a confirmation requiring a reason, and resending the invite email.

#### Scenario: Revoke a pending invite
- **WHEN** the admin revokes a pending invite and provides a reason
- **THEN** the confirmation states the recipient will no longer be able to accept
- **AND** the invite status becomes revoked and its link stops working

#### Scenario: Resend invite email
- **WHEN** the admin triggers resend on a pending invite
- **THEN** the invite email is sent again and a confirmation toast is shown
