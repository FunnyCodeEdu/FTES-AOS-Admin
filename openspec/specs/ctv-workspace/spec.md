# ctv-workspace Specification

## Purpose
TBD - created by archiving change admin-ctv-program. Update Purpose after archive.
## Requirements
### Requirement: Workspace home scoped to active grants
The workspace home at `/ctv` SHALL list exactly the scopes from the CTV's active (non-expired) grants as cards with their grant expiry, plus an aggregated to-do queue of pending items across those scopes.

#### Scenario: CTV opens workspace
- **WHEN** a CTV with active grants on two scopes opens `/ctv`
- **THEN** exactly two scope cards render with their expiry dates
- **AND** the to-do queue aggregates pending posts/resources from those two scopes only

#### Scenario: All grants expired
- **WHEN** a CTV whose grants have all expired opens `/ctv`
- **THEN** an empty state explains their access has expired and how to request an extension
- **AND** the `/ctv` navigation group disappears after the profile refresh

### Requirement: Out-of-scope data never visible
The workspace SHALL never render data outside the CTV's granted scopes — in navigation, lists, or search — and direct navigation to an out-of-scope resource SHALL yield the 403 page without leaking the resource's details.

#### Scenario: CTV edits URL to another group
- **WHEN** a CTV changes the URL to `/ctv/groups/:groupId` for a group outside their grants
- **THEN** the 403 page is shown stating the resource is outside their assigned scope
- **AND** no request for that group's data is issued and no group name is revealed

#### Scenario: Search stays inside scope
- **WHEN** a CTV searches within the workspace
- **THEN** every search request carries the current scope id
- **AND** results only ever contain items belonging to their granted scopes

#### Scenario: CTV opens an admin console URL
- **WHEN** a CTV navigates to any admin console route such as `/community`
- **THEN** the 403 page is shown naming the missing permissions

### Requirement: Tools gated by granted permissions
Within a scope, the workspace SHALL render only the tabs and actions backed by the permissions of that scope's grant.

#### Scenario: CTV without approve permission
- **WHEN** a resource-CTV whose grant lacks `resource.approve` opens their resource workspace
- **THEN** upload and edit actions render but no approve action exists in the DOM

#### Scenario: Moderation action within scope
- **WHEN** a group-CTV with post moderation permission approves a pending post of their group
- **THEN** the mutation is sent with the scope id and the to-do queue refreshes

#### Scenario: Backend rejects out-of-scope mutation
- **WHEN** a workspace mutation is rejected by the backend as out of scope
- **THEN** an "outside your assigned scope" error is shown and the scope list is refetched

### Requirement: Grant expiry awareness in workspace
The workspace SHALL warn the CTV when a grant expires within 7 days and SHALL remove scope access from the UI as soon as the refreshed profile no longer contains the grant.

#### Scenario: Grant nearing expiry
- **WHEN** a CTV's grant on a scope expires in fewer than 7 days
- **THEN** a warning banner on that scope names the expiry date and suggests contacting the admin

#### Scenario: Grant revoked mid-session
- **WHEN** an admin revokes a grant while the CTV is using the workspace and the profile refreshes
- **THEN** the corresponding scope card and navigation entries disappear
- **AND** staying on that scope's page redirects to the 403 page

