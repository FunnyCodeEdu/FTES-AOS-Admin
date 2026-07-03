# admin-app-shell Specification

## Purpose
TBD - created by archiving change admin-foundation. Update Purpose after archive.
## Requirements
### Requirement: Persistent admin layout
The system SHALL render all authenticated routes inside a persistent layout composed of a collapsible sidebar, a header (breadcrumb, theme toggle, notification bell, user menu), and a content area.

#### Scenario: Authenticated user navigates between routes
- **WHEN** an authenticated user navigates from the dashboard to another route
- **THEN** the sidebar and header persist without remounting
- **AND** only the content area re-renders

#### Scenario: Sidebar collapse state persists
- **WHEN** the user collapses the sidebar and reloads the page
- **THEN** the sidebar renders collapsed on load

### Requirement: Dark mode
The system SHALL provide a light/dark theme toggle using Ant Design v5 theme algorithms, persist the choice locally, and default to the OS `prefers-color-scheme` on first visit.

#### Scenario: User toggles dark mode
- **WHEN** the user clicks the theme toggle in the header
- **THEN** the entire UI switches theme immediately without reload
- **AND** the choice is restored on the next visit

#### Scenario: First visit follows OS preference
- **WHEN** a user with no saved theme preference and OS dark mode enabled opens the app
- **THEN** the app renders in dark theme

### Requirement: Notification center
The system SHALL display a notification bell with an unread count badge and a drawer listing notifications with cursor pagination, and SHALL surface newly arrived notifications as toasts.

#### Scenario: Unread notifications exist
- **WHEN** the user has unread notifications
- **THEN** the bell shows the unread count
- **AND** opening the drawer lists notifications newest-first with read/unread distinction

#### Scenario: Marking notifications read
- **WHEN** the user marks a notification (or all) as read
- **THEN** the unread badge updates without a full page reload

#### Scenario: Notification list fails to load
- **WHEN** the notification list request fails
- **THEN** the drawer shows an error state with a retry action

### Requirement: Async task tracking
The system SHALL track server-side async tasks (e.g. exports, broadcasts) in the notification center with progress, and SHALL show a completion toast when a task finishes.

#### Scenario: Task completes while user is on any page
- **WHEN** a running async task transitions to completed
- **THEN** a success toast appears with a link to the result when available
- **AND** the task entry in the drawer reflects the final status

#### Scenario: Task fails
- **WHEN** an async task fails
- **THEN** an error toast appears with the failure message from the backend envelope

### Requirement: Shell renders only permitted content
The shell SHALL NOT reveal any navigation or header entry the user lacks permission for; the shell itself SHALL be identical in structure across permission tiers.

#### Scenario: CTV-tier user sees minimal shell
- **WHEN** a user whose only permissions are CTV scoped grants logs in
- **THEN** the sidebar shows only entries backed by their granted permissions
- **AND** no admin console entry is present in the DOM

#### Scenario: User with no permissions
- **WHEN** an authenticated user with an empty permission list opens the app
- **THEN** the shell renders with an empty navigation and the dashboard shows a "no access granted" empty state
- **AND** no error is thrown

