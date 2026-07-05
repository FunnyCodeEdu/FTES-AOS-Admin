# ctv-onboarding Specification

## Purpose
TBD - created by archiving change admin-ctv-program. Update Purpose after archive.
## Requirements
### Requirement: Invite landing requires authentication
The onboarding page at `/ctv/onboarding/:token` SHALL require login before showing invite content, preserving the onboarding URL as `returnUrl`.

#### Scenario: Recipient opens invite link while logged out
- **WHEN** a logged-out recipient opens the invite link
- **THEN** they are redirected to `/login` with the onboarding URL as `returnUrl`
- **AND** after login they land back on the onboarding page

### Requirement: Invite summary and mandatory checklist
The onboarding page SHALL display the invite summary (scopes, permissions, grant expiry, inviter, note) and a mandatory checklist (terms, scope-type guides, commitments); the accept action SHALL stay disabled until all required items are acknowledged.

#### Scenario: Recipient reviews and acknowledges
- **WHEN** the recipient opens a valid invite
- **THEN** the summary and checklist are displayed
- **AND** the accept button enables only after all required checklist items are ticked

#### Scenario: Partial acknowledgement
- **WHEN** any required checklist item is unticked
- **THEN** the accept button remains disabled

### Requirement: Acceptance activates grants immediately
Accepting the invite SHALL activate the scoped grants server-side, refresh the session's permission data, and redirect the new CTV into the workspace without re-login.

#### Scenario: Recipient accepts
- **WHEN** the recipient confirms acceptance with all items acknowledged
- **THEN** the grants become active and the user profile is refetched
- **AND** the user is redirected to `/ctv` where the workspace navigation now appears

### Requirement: Invalid invite handling
The onboarding page SHALL show a distinct terminal state for expired or revoked invites and SHALL reject acceptance from an account that does not match the invited email.

#### Scenario: Expired or revoked invite
- **WHEN** the recipient opens a link whose invite is expired or revoked
- **THEN** a terminal screen explains the invite is no longer valid and whom to contact
- **AND** no grant is activated

#### Scenario: Wrong account attempts acceptance
- **WHEN** a logged-in user whose email does not match the invite tries to accept
- **THEN** the backend rejection is shown with an option to log out and switch accounts
- **AND** no grant is activated for the mismatched account

