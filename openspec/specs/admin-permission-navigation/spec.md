# admin-permission-navigation Specification

## Purpose
TBD - created by archiving change admin-foundation. Update Purpose after archive.
## Requirements
### Requirement: Navigation generated from backend permissions
The system SHALL generate the sidebar navigation from the permission leaf list returned by the backend after login, and SHALL NOT compare role strings anywhere in the frontend.

#### Scenario: Domain admin sees only their consoles
- **WHEN** a user whose permissions cover only the community domain logs in
- **THEN** the navigation shows the community console entries
- **AND** entries of other domains are absent from the rendered menu

#### Scenario: No role string comparison
- **WHEN** navigation items are evaluated
- **THEN** visibility is decided solely by `requiredPermissions` matching the user's permission set
- **AND** no navigation item is gated by a role name

### Requirement: Unauthenticated redirect
The route guard SHALL redirect users without a session to `/login`, preserving the attempted path as `returnUrl` and restoring it after successful login.

#### Scenario: Deep link while logged out
- **WHEN** a logged-out user opens a protected deep link
- **THEN** they are redirected to `/login?returnUrl=<path>`
- **AND** after logging in they land on the original path if permitted

#### Scenario: Unsafe returnUrl rejected
- **WHEN** the `returnUrl` is not an internal path
- **THEN** the user is redirected to `/` instead

### Requirement: Missing permission yields explanatory 403
The route guard SHALL redirect users lacking a route's required permissions to a 403 page that names the missing permission(s) and the blocked path.

#### Scenario: User without permission opens a URL directly
- **WHEN** an authenticated user lacking `user.lock` opens a route requiring it
- **THEN** they are shown the 403 page
- **AND** the page lists `user.lock` as the missing permission and offers a link back to the dashboard

#### Scenario: CTV opens an admin console URL
- **WHEN** a CTV whose only access is scoped grants types an admin console URL (e.g. `/users`)
- **THEN** the 403 page is shown naming the missing permissions
- **AND** no console data request is issued

### Requirement: Scoped grant expiry respected
Permission helpers SHALL treat scoped grants past their `expiresAt` as absent for both navigation and route guarding.

#### Scenario: Expired scoped grant
- **WHEN** a CTV's only grant for a scope has expired
- **THEN** navigation entries backed by that grant disappear
- **AND** direct navigation to the scoped route results in the 403 page

### Requirement: Permission changes take effect without re-login
The system SHALL re-evaluate navigation and route access when the user profile (`/auth/me`) is refetched after a permission change signal.

#### Scenario: Permission revoked mid-session
- **WHEN** the backend signals a permission change and the profile is refetched with fewer permissions
- **THEN** navigation entries requiring revoked permissions are removed
- **AND** the current route, if no longer permitted, redirects to the 403 page

#### Scenario: Profile still loading
- **WHEN** a page is opened while the permission list has not loaded yet
- **THEN** a full-page skeleton is shown instead of a premature 403 or empty navigation

